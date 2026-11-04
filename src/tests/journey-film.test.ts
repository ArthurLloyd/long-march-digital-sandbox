import { expect, it } from 'vitest';
import { heightAt, projectGeo } from '../app/landscape/geography';
import * as THREE from 'three';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { createJourneyTransport, journeyChapters } from '../features/timeline';
import { cueIndex, crossingSeals } from '../shared/content/journey-screenplay';
import { createMarchLayer } from '../app/landscape/march-layer';
import {
  filmExtent,
  marchFraming,
  routeCameraLevel,
  sampleFilmCamera,
} from '../app/landscape/film-camera';

const { plan } = createJourneyContent(raw, 'exhibition');
it('gives every exhibition chapter readable, ordered shots on the same transport', () => {
  for (const c of plan.chapters) {
    expect(c.cues![0]![0]).toBe(0);
    expect(c.cues!.length).toBeGreaterThanOrEqual(3);
    for (const [i, [at, , heading, caption]] of c.cues!.entries()) {
      expect(heading.trim()).toBeTruthy();
      expect(caption.trim()).toBeTruthy();
      expect(cueIndex(c.cues!, at)).toBe(i);
    }
  }
  const t = createJourneyTransport(plan);
  const c = journeyChapters(plan, 'central')[0]!;
  t.cinematic(true);
  t.play();
  t.advance(c.duration + 0.1);
  expect(t.read().playing).toBe(true);
  expect(t.read().pendingEventId).toBeNull();
  t.seek(0);
  t.cinematic(false);
  t.play();
  t.advance(c.duration);
  expect(t.read().pendingEventId).toBe(c.eventIds[0]);
});
it('places every crossing seal on an existing route vertex and reconstructs the same camera after rewind', () => {
  const t = createJourneyTransport(plan);
  const layer = createMarchLayer(new THREE.Scene(), () => 0);
  layer.setTransport(t);
  t.cinematic(true);
  for (const seal of crossingSeals) {
    const track = plan.tracks.find((track) => track.id === seal.track)!;
    const c = journeyChapters(plan, 'central').find(
      (c) => c.id === track.chapterId,
    )!;
    expect(track.points[seal.point]).toBeDefined();
    const frame = () => {
      t.seek(c.start + c.duration * seal.at);
      const p = layer.update(2)!.point;
      return sampleFilmCamera(
        c.cues!,
        seal.at,
        p,
        filmExtent([track]),
        1,
        0,
        false,
      ).position.toArray();
    };
    const before = frame();
    t.seek(0);
    layer.update(4);
    expect(frame()).toEqual(before);
  }
  layer.dispose();
});

it('centres the two Ganzi reunion chapters on their stationary flags at every shot and follow distance', () => {
  const terrain = (x: number, z: number) => heightAt(x, z, 12);
  for (const id of ['chapter-ex-event-ganzi', 'chapter-ex-event-red2-formed']) {
    const chapter = plan.chapters.find((c) => c.id === id)!;
    const formation = plan.formations!.find((f) => f.chapterId === id)!;
    const [x, z] = projectGeo(formation.anchor);
    const point = new THREE.Vector3(x, terrain(x, z) + 0.018, z);
    const bounds = filmExtent([]);
    const frame = marchFraming(id, undefined, terrain, point);
    expect(frame).not.toBeNull();
    const datum = routeCameraLevel(bounds, point, terrain);
    for (const zoom of [0.7, 1, 1.4]) {
      for (const progress of [0, 0.2, 0.34, 0.5, 0.72, 0.9, 1]) {
        const pose = sampleFilmCamera(
          chapter.cues!,
          progress,
          point,
          bounds,
          zoom,
          datum,
          false,
          bounds,
          false,
          frame,
        );
        const shifted = sampleFilmCamera(
          chapter.cues!,
          progress,
          point.clone().add(new THREE.Vector3(0, 0.15, 0)),
          bounds,
          zoom,
          datum + 1,
          false,
          bounds,
          false,
          frame,
        );
        expect(shifted).toEqual(pose);
        expect(pose.position.y - terrain(x, z)).toBeLessThan(
          pose.position.distanceTo(pose.target),
        );
        for (const [width, height] of [
          [1912, 805],
          [1280, 810],
        ]) {
          const camera = new THREE.PerspectiveCamera(
            43,
            width! / height!,
            0.02,
            160,
          );
          camera.setViewOffset(width!, height!, -96, -32, width!, height!);
          camera.position.copy(pose.position);
          camera.lookAt(pose.target);
          camera.updateMatrixWorld();
          const projected = point.clone().project(camera);
          const y = (1 - projected.y) / 2;
          expect(y, id + ' at ' + progress).toBeGreaterThan(0.45);
          expect(y, id + ' at ' + progress).toBeLessThan(0.7);
          expect(Math.abs(projected.x)).toBeLessThan(0.27);
        }
      }
    }
    expect(
      marchFraming('chapter-ex-event-red25-start', undefined, terrain, point),
    ).toBeNull();
  }
});

it('keeps the marching subject clear of the subtitle in the bridge, mountain and reunion chapters without following small rises', () => {
  const terrain = (x: number, z: number) => heightAt(x, z, 12);
  const transport = createJourneyTransport(plan);
  const layer = createMarchLayer(new THREE.Scene(), terrain);
  layer.setTransport(transport);
  transport.cinematic(true);
  const chapters = journeyChapters(plan, 'central');
  for (const id of [
    'chapter-event-ld',
    'chapter-event-sn',
    'chapter-ex-event-dawei',
    'chapter-ex-event-huining',
    'chapter-ex-event-jiangtai',
  ]) {
    const chapter = chapters.find((c) => c.id === id)!;
    const tracks = plan.tracks.filter((track) => track.chapterId === id);
    const track = tracks.find(
      (track) => track.camp === 'red_army' && track.points.length > 1,
    )!;
    const frame = marchFraming(id, track, terrain);
    expect(frame, id).not.toBeNull();
    const bounds = filmExtent(tracks);
    const datum = routeCameraLevel(bounds, new THREE.Vector3(), terrain);
    for (const zoom of [0.7, 1, 1.4]) {
      for (const progress of [0, 0.2, 0.34, 0.42, 0.6, 0.71, 0.85, 0.99]) {
        transport.seek(chapter.start + chapter.duration * progress);
        const point = layer.update(2)!.point.clone();
        const sample = (p: THREE.Vector3) =>
          sampleFilmCamera(
            chapter.cues!,
            progress,
            p,
            bounds,
            zoom,
            datum,
            false,
            bounds,
            false,
            frame,
          );
        const pose = sample(point);
        const ridge = sample(point.clone().add(new THREE.Vector3(0, 0.15, 0)));
        expect(ridge.position.toArray()).toEqual(pose.position.toArray());
        expect(ridge.target.toArray()).toEqual(pose.target.toArray());
        for (const [w, h] of [
          [1912, 805],
          [1280, 810],
        ] as const) {
          const camera = new THREE.PerspectiveCamera(43, w / h, 0.02, 160);
          camera.setViewOffset(w, h, -96, -32, w, h);
          camera.position.copy(pose.position);
          camera.lookAt(pose.target);
          camera.updateMatrixWorld();
          const projected = point.clone().project(camera);
          const y = (1 - projected.y) / 2;
          expect(y, id + ' at ' + progress).toBeGreaterThan(0.34);
          expect(y, id + ' at ' + progress).toBeLessThan(0.73);
          expect(Math.abs(projected.x)).toBeLessThan(0.27);
        }
      }
    }
  }
  expect(marchFraming('chapter-event-sd-1', undefined, terrain)).toBeNull();
  layer.dispose();
});
