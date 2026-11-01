import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContractWorkbench } from './workbench/ContractWorkbench';
import { createDraftV2Dataset } from './fixtures/v2-dataset';

describe('隔离接线工作台', () => {
  it('可挂载旧模块、切换阶段并记录回调', async () => {
    render(<ContractWorkbench />);
    expect(screen.getByRole('note')).toHaveTextContent('非史实工程样本');
    fireEvent.change(screen.getByLabelText('历史阶段输入'), {
      target: { value: '' },
    });
    expect(screen.getByLabelText('回调日志')).toHaveTextContent('phase.input');
    fireEvent.change(screen.getByLabelText('测试模块'), {
      target: { value: 'history' },
    });
    expect(
      await screen.findByRole('heading', { name: '测试事件（非史实）' }),
    ).toBeInTheDocument();
  });
  it('严格拒绝非法 JSON、额外执行字段及非草稿输入', () => {
    render(<ContractWorkbench />);
    const editor = screen.getByLabelText('v1/v2 数据 JSON');
    fireEvent.change(editor, { target: { value: '{invalid' } });
    fireEvent.click(screen.getByRole('button', { name: '验证并应用工程输入' }));
    expect(screen.getByRole('status')).not.toHaveTextContent('校验通过');
    const candidate = createDraftV2Dataset();
    candidate.events[0]!.reviewStatus = 'in_review';
    fireEvent.change(editor, { target: { value: JSON.stringify(candidate) } });
    fireEvent.click(screen.getByRole('button', { name: '验证并应用工程输入' }));
    expect(screen.getByRole('status')).toHaveTextContent('工作台只接受');
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          events: [],
          routes: [],
          sources: [],
          eval: '1',
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '验证并应用工程输入' }));
    expect(screen.getByRole('status')).not.toHaveTextContent('校验通过');
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({ events: [], routes: [], sources: [] }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '验证并应用工程输入' }));
    expect(screen.getByRole('status')).toHaveTextContent('结构与关联校验通过');
  });
});
