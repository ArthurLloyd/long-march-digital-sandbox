import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createTerrainTile,
  snapTerrainWindow,
} from '../app/landscape/terrain-tile';
import { createTerrainLod } from '../app/landscape/terrain-lod';
import { createTerrainRequests } from '../app/landscape/terrain-requests';
import {
  constrainTerrainCamera,
  localTerrainPose,
  createSurfaceGesture,
  cursorTerrainZoom,
} from '../app/landscape/terrain-navigation';
import { createTerrainField } from '../app/landscape/terrain-field';

describe('连续地形近景与共享高度', () => {
  it('高度查询匹配实际三角面；边缘与父网格逐点接合，换档不使用旧高度', () => {
    let gain = 1;
    const surface = (x: number, z: number) =>
      (0.1 + Math.sin(x * 4) * Math.cos(z * 3) * 0.05) * gain;
    const base = createTerrainTile(
      [0, 0, 2, 2],
      9,
      9,
      surface,
      () => 100,
      () => 0,
    );
    const bounds = snapTerrainWindow(base, 1, 1, 0.7);
    const fine = createTerrainTile(
      bounds,
      33,
      33,
      surface,
      () => 100,
      () => 0,
      base,
    );
    for (let i = 0; i <= 32; i++) {
      const x = bounds[0] + ((bounds[2] - bounds[0]) * i) / 32;
      expect(fine.height(x, bounds[1])).toBeCloseTo(
        base.height(x, bounds[1]),
        6,
      );
    }
    const mesh = new THREE.Mesh(fine.geometry, new THREE.MeshBasicMaterial());
    mesh.updateMatrixWorld();
    const ray = new THREE.Raycaster(
      new THREE.Vector3(1.012, 2, 1.033),
      new THREE.Vector3(0, -1, 0),
    );
    expect(ray.intersectObject(mesh)[0]!.point.y).toBeCloseTo(
      fine.height(1.012, 1.033),
      6,
    );
    const old = fine.height(1, 1);
    gain = 6;
    base.update();
    fine.update();
    expect(fine.height(1, 1)).toBeCloseTo(old * 6, 5);
    for (const value of [1, 6, 12, 24]) {
      gain = value;
      base.update();
      fine.update();
      expect(Number.isFinite(fine.height(1, 1))).toBe(true);
    }
    base.geometry.dispose();
    fine.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  it('全局与局部切换恢复索引、法线和界限，始终最多三个网格，释放替换资源', () => {
    const root = new THREE.Group(),
      material = new THREE.MeshStandardMaterial();
    let gain = 1;
    const lod = createTerrainLod(
      root,
      material,
      [0, 0, 4, 4],
      33,
      33,
      (x, z) => gain * (0.1 + x * 0.03 + z * 0.02),
      () => 100,
      () => 0,
    );
    const original = lod.meshes[0]!.geometry.index!.count;
    const baseIndex = lod.meshes[0]!.geometry.index;
    lod.setRegion([0.5, 0.5, 2.5, 2.5]);
    lod.refine(1, 1, 0.1);
    expect(lod.meshes).toHaveLength(3);
    expect(lod.meshes[0]!.geometry.index).toBe(baseIndex);
    const firstHeight = lod.heightAt(1.01, 1.02);
    lod.advance(performance.now() + 350);
    expect(Number.isFinite(lod.heightAt(1.01, 1.02))).toBe(true);
    expect(Math.abs(lod.heightAt(1.01, 1.02) - firstHeight)).toBeLessThan(0.05);
    const same = lod.meshes[2];
    expect(lod.refine(1.001, 1.001, 0.105)).toBe(false);
    expect(lod.meshes[2]).toBe(same);
    const old = lod.meshes[2]!.geometry,
      disposed = vi.spyOn(old, 'dispose');
    lod.refine(2, 2, 0.08);
    expect(disposed).toHaveBeenCalledOnce();
    const before = lod.heightAt(2, 2);
    gain = 12;
    lod.update();
    expect(lod.heightAt(2, 2)).toBeCloseTo(before * 12, 5);
    lod.setRegion(null);
    expect(lod.meshes).toHaveLength(1);
    expect(lod.meshes[0]!.geometry.index!.count).toBe(original);
    expect(lod.meshes[0]!.geometry.index).toBe(baseIndex);
    expect(
      Array.from(lod.meshes[0]!.geometry.getAttribute('normal').array).every(
        Number.isFinite,
      ),
    ).toBe(true);
    expect(lod.meshes[0]!.geometry.boundingBox).not.toBeNull();
    lod.dispose();
    expect(root.children).toHaveLength(0);
    material.dispose();
  });
  it('全域原始高程与局部增强均保持有限值；真实源数据未改写', () => {
    const data = {
      id: 'sample',
      bounds: [105, 27, 106, 28],
      cols: 3,
      rows: 3,
      heights: [100, 200, 120, 140, 500, 220, 160, 210, 100],
    };
    const before = JSON.stringify(data),
      field = createTerrainField(data),
      b = field.worldBounds;
    for (const gain of [1, 6, 12, 24])
      for (let i = 0; i < 10; i++)
        expect(
          Number.isFinite(
            field.height(b[0] + ((b[2] - b[0]) * i) / 9, b[1], gain),
          ),
        ).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
});
describe('局部观察输入与安全相机', () => {
  it('滚轮以偏离屏幕中心的实际命中点为锚，拉近拉远均保持屏幕坐标，空白不跳转', () => {
    const camera = new THREE.PerspectiveCamera(43, 1920 / 1080, 0.0001, 160),
      target = new THREE.Vector3();
    camera.position.set(0, 1, 2);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const hit = new THREE.Vector3(0.6, 0, 0.2),
      before = hit.clone().project(camera);
    for (const delta of [-120, 120]) {
      const pose = cursorTerrainZoom(camera.position, target, hit, delta, 1)!;
      const next = new THREE.PerspectiveCamera(43, 1920 / 1080, 0.0001, 160);
      next.position.copy(pose.position);
      next.lookAt(pose.target);
      next.updateMatrixWorld();
      const after = hit.clone().project(next);
      expect(after.x).toBeCloseTo(before.x, 7);
      expect(after.y).toBeCloseTo(before.y, 7);
      expect(pose.target.x).not.toBe(target.x);
    }
    expect(
      cursorTerrainZoom(camera.position, target, null, -120, 1),
    ).toBeNull();
  });
  it('聚焦更新到命中位置，实际靠近且无效命中保持视角', () => {
    const position = new THREE.Vector3(0, 1, 2),
      target = new THREE.Vector3(),
      hit = new THREE.Vector3(0.8, 0.12, 0.5);
    const pose = localTerrainPose(position, target, hit)!;
    expect(pose.target.x).toBe(hit.x);
    expect(pose.target.z).toBe(hit.z);
    expect(pose.position.distanceTo(pose.target)).toBeLessThan(
      position.distanceTo(target) / 4,
    );
    expect(
      localTerrainPose(position, target, new THREE.Vector3(NaN, 0, 0)),
    ).toBeNull();
    expect(position.toArray()).toEqual([0, 1, 2]);
  });
  it('UI目标与拖动不触发聚焦，真实画布双击可用', () => {
    const canvas = document.createElement('canvas'),
      gesture = createSurfaceGesture(canvas);
    const e = { clientX: 10, clientY: 20, button: 0, target: canvas };
    gesture.down(e);
    expect(
      gesture.accept({ ...e, target: document.createElement('button') }),
    ).toBe(false);
    gesture.move({ ...e, clientX: 24 });
    expect(gesture.accept(e)).toBe(false);
    gesture.down(e);
    expect(gesture.accept(e)).toBe(false);
    expect(createSurfaceGesture(canvas).accept(e)).toBe(true);
  });
  it('不同入口和旧/近景书签共用地表及近裁剪体积约束，允许自然山体遮挡', () => {
    const ground = (x: number, z: number) =>
      x > 0.2 && x < 0.4 && z > 0.2 && z < 0.4 ? 2 : 0.1;
    const camera = new THREE.PerspectiveCamera(43, 1920 / 1080, 0.02, 160);
    const target = new THREE.Vector3(0, 0.1, 0);
    for (const input of [
      new THREE.Vector3(0.0001, -1, 0.0001),
      new THREE.Vector3(0, 0.105, 0.004),
      new THREE.Vector3(0, 0.2, 0.5),
    ]) {
      camera.position.copy(input);
      constrainTerrainCamera(camera, target, ground, [-2, -2, 2, 2]);
      expect(camera.position.y).toBeGreaterThan(
        ground(camera.position.x, camera.position.z),
      );
      expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
      expect(camera.near).toBeGreaterThan(0);
      expect(camera.near).toBeLessThanOrEqual(0.02);
    }
    camera.position.set(0, 0.11, 0.01);
    constrainTerrainCamera(camera, target, ground, [-2, -2, 2, 2]);
    expect(camera.position.y).toBeLessThan(0.15);
    expect(camera.near).toBeLessThan(0.001);
  });
});
describe('地形异步生命期', () => {
  it('keeps the new region pending when an older load finishes, and releases it on completion or cancellation', async () => {
    const pending = new Map<string, (v: string) => void>();
    const commit = vi.fn();
    const requests = createTerrainRequests<string>(
      (id) => new Promise((resolve) => pending.set(id, resolve)),
      commit,
    );
    const old = requests.request('jinsha');
    const arriving = requests.request('luding');
    pending.get('jinsha')!('old terrain');
    await old;
    expect(requests.pendingId).toBe('luding');
    expect(commit).not.toHaveBeenCalled();
    pending.get('luding')!('arriving terrain');
    await arriving;
    expect(requests.pendingId).toBeNull();
    expect(commit).toHaveBeenCalledExactlyOnceWith(
      'arriving terrain',
      'luding',
    );
    const cancelled = requests.request('snow');
    requests.cancel();
    expect(requests.pendingId).toBeNull();
    pending.get('snow')!('cancelled terrain');
    await cancelled;
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it('最后有效请求胜出；全景取消和卸载后不再提交；失败保留现有地表', async () => {
    const pending = new Map<string, (v: string) => void>(),
      commit = vi.fn();
    const requests = createTerrainRequests<string>(
      (id) => new Promise((resolve) => pending.set(id, resolve)),
      commit,
    );
    const a = requests.request('a'),
      b = requests.request('b');
    pending.get('b')!('B');
    await b;
    pending.get('a')!('A');
    await a;
    expect(commit.mock.calls).toEqual([['B', 'b']]);
    const c = requests.request('c');
    requests.cancel();
    pending.get('c')!('C');
    await c;
    expect(commit).toHaveBeenCalledTimes(1);
    const d = requests.request('d');
    requests.dispose();
    pending.get('d')!('D');
    await d;
    expect(commit).toHaveBeenCalledTimes(1);
    const broken = createTerrainRequests<string>(async () => {
      throw new Error('offline');
    }, commit);
    expect(await broken.request('x')).toBeNull();
    expect(broken.size).toBe(0);
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it('缓存限制为三个字段，退出后不会启动新的加载', async () => {
    const load = vi.fn(async (id: string) => id),
      commit = vi.fn();
    const requests = createTerrainRequests(load, commit);
    for (const id of ['a', 'b', 'c', 'd', 'e']) await requests.request(id);
    expect(requests.size).toBe(3);
    expect(commit).toHaveBeenCalledTimes(5);
    requests.dispose();
    expect(await requests.request('f')).toBeNull();
    expect(load).toHaveBeenCalledTimes(5);
  });
});
