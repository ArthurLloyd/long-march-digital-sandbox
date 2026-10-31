import { z } from 'zod';
import {
  auditedFields,
  contentTypeSchema,
  idListSchema,
  nonempty,
  sameIds,
} from './primitives';
import {
  experienceIdSchema,
  interactionIdSchema,
  INTERACTION_TYPE_BY_ID,
  requiredInteractionsFor,
} from './experience-catalog';

export const materialSchema = z.strictObject({
  materialId: nonempty,
  title: nonempty,
  text: nonempty,
  contentType: contentTypeSchema,
  assetIds: idListSchema,
  sourceIds: idListSchema,
});
const choiceSchema = z.strictObject({ choiceId: nonempty, text: nonempty });
const categorySchema = z.enum([
  'primary_source',
  'editorial_summary',
  'artistic_recreation',
]);
const pairSchema = z.strictObject({
  materialId: nonempty,
  conclusionId: nonempty,
});
const classificationSchema = z.strictObject({
  materialId: nonempty,
  category: categorySchema,
});
const fields = {
  interactionId: interactionIdSchema,
  experienceId: experienceIdSchema,
  segmentId: nonempty,
  prompt: nonempty,
  required: z.literal(true),
  feedback: nonempty,
  explanation: nonempty,
  completionRequirements: z.strictObject({
    requireExplanationAcknowledgement: z.literal(true),
    allowIncorrectWithExplanation: z.literal(true),
  }),
  ...auditedFields,
};
export const interactionDefinitionSchema = z
  .discriminatedUnion('interactionType', [
    z.strictObject({
      ...fields,
      interactionType: z.literal('observe_hotspots'),
      materials: z.array(materialSchema).min(2),
      requiredMaterialIds: idListSchema,
      visitOrder: z.enum(['any', 'listed']),
    }),
    z.strictObject({
      ...fields,
      interactionType: z.literal('sort_sequence'),
      choices: z.array(choiceSchema).length(3),
      correctOrder: idListSchema,
    }),
    z.strictObject({
      ...fields,
      interactionType: z.literal('evidence_selection'),
      choices: z.array(choiceSchema).length(2),
      correctChoiceId: nonempty,
    }),
    z.strictObject({
      ...fields,
      interactionType: z.literal('material_matching'),
      materials: z.array(materialSchema).length(2),
      conclusions: z
        .array(z.strictObject({ conclusionId: nonempty, text: nonempty }))
        .length(2),
      correctPairs: z.array(pairSchema).length(2),
    }),
    z.strictObject({
      ...fields,
      interactionType: z.literal('classify_source'),
      materials: z.array(materialSchema).length(3),
      correctClassifications: z.array(classificationSchema).length(3),
    }),
  ])
  .superRefine((interaction, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      !requiredInteractionsFor(interaction.experienceId).includes(
        interaction.interactionId,
      ) ||
      INTERACTION_TYPE_BY_ID[interaction.interactionId] !==
        interaction.interactionType
    )
      fail('互动 ID、体验及类型与产品契约不匹配');
    if (
      'materials' in interaction &&
      new Set(interaction.materials.map((m) => m.materialId)).size !==
        interaction.materials.length
    )
      fail('材料 ID 重复');
    if (
      'choices' in interaction &&
      new Set(interaction.choices.map((c) => c.choiceId)).size !==
        interaction.choices.length
    )
      fail('选项 ID 重复');
    switch (interaction.interactionType) {
      case 'observe_hotspots':
        if (
          !sameIds(
            interaction.requiredMaterialIds,
            interaction.materials.map((m) => m.materialId),
          )
        )
          fail('必要观察必须覆盖全部材料且不能引用未知材料');
        if (
          interaction.interactionId === 'sd-01' &&
          (interaction.materials.length !== 4 ||
            interaction.visitOrder !== 'listed')
        )
          fail('sd-01 必须按 listed 顺序查看四份阶段材料');
        if (
          interaction.interactionId !== 'sd-01' &&
          interaction.materials.length !== 2
        )
          fail('观察互动必须提供两份规定材料');
        break;
      case 'sort_sequence':
        if (
          !sameIds(
            interaction.correctOrder,
            interaction.choices.map((c) => c.choiceId),
          )
        )
          fail('正确顺序必须是全部选项的完整排列');
        break;
      case 'evidence_selection':
        if (
          !interaction.choices.some(
            (c) => c.choiceId === interaction.correctChoiceId,
          )
        )
          fail('正确选项不存在');
        break;
      case 'material_matching':
        if (
          !sameIds(
            interaction.correctPairs.map((p) => p.materialId),
            interaction.materials.map((m) => m.materialId),
          ) ||
          !sameIds(
            interaction.correctPairs.map((p) => p.conclusionId),
            interaction.conclusions.map((c) => c.conclusionId),
          )
        )
          fail('材料与结论必须完整一一配对');
        break;
      case 'classify_source':
        if (
          !sameIds(
            interaction.correctClassifications.map((c) => c.materialId),
            interaction.materials.map((m) => m.materialId),
          )
        )
          fail('材料分类必须完整且不重复');
        if (
          !sameIds(
            interaction.correctClassifications.map((c) => c.category),
            ['primary_source', 'editorial_summary', 'artistic_recreation'],
          )
        )
          fail('分类互动必须覆盖三种材料性质');
        break;
    }
  });
export type InteractionDefinition = z.infer<typeof interactionDefinitionSchema>;
export const interactionResponseSchema = z.discriminatedUnion(
  'interactionType',
  [
    z.strictObject({
      interactionType: z.literal('observe_hotspots'),
      visitedMaterialIds: idListSchema,
    }),
    z.strictObject({
      interactionType: z.literal('sort_sequence'),
      orderedChoiceIds: idListSchema,
    }),
    z.strictObject({
      interactionType: z.literal('evidence_selection'),
      selectedChoiceId: nonempty.nullable(),
    }),
    z.strictObject({
      interactionType: z.literal('material_matching'),
      pairs: z.array(pairSchema),
    }),
    z.strictObject({
      interactionType: z.literal('classify_source'),
      classifications: z.array(classificationSchema),
    }),
  ],
);
export type InteractionResponse = z.infer<typeof interactionResponseSchema>;
