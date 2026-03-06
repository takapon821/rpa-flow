import { VisualStep } from '@/hooks/useVisualEditor';

/**
 * DB形式のステップ型（robotSteps テーブルに対応）
 */
export interface DbStep {
  id: string;
  stepOrder: number;
  actionType: string;
  config: Record<string, unknown>;
}

/**
 * VisualStep → DbStep 変換
 * ビジュアルエディタのステップをDB形式に変換する
 */
export function visualStepToDbStep(step: VisualStep, order: number): Omit<DbStep, 'id'> {
  return {
    stepOrder: order,
    actionType: step.type,
    config: {
      selector: step.selector,
      value: step.value,
      url: step.url,
      description: step.description,
    },
  };
}

/**
 * DbStep → VisualStep 変換
 * DB形式のステップをビジュアルエディタ形式に変換する
 */
export function dbStepToVisualStep(dbStep: DbStep): VisualStep {
  const actionType = dbStep.actionType as VisualStep['type'];

  // actionType が有効な type か検証
  const validTypes = ['navigate', 'click', 'type', 'select', 'scroll', 'wait'];
  if (!validTypes.includes(actionType)) {
    throw new Error(`Invalid action type: ${dbStep.actionType}`);
  }

  return {
    id: dbStep.id,
    type: actionType,
    selector: dbStep.config.selector as string | undefined,
    value: dbStep.config.value as string | undefined,
    url: dbStep.config.url as string | undefined,
    description: dbStep.config.description as string | undefined,
  };
}
