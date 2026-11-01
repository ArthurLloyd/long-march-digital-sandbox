import {
  interactionResponseSchema,
  type InteractionDefinition,
  type InteractionResponse,
} from '../../shared/contracts';

export interface InteractionProgress {
  response: InteractionResponse;
  complete: boolean;
  correct: boolean;
}
const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
export function evaluateInteractionResponse(
  definition: InteractionDefinition,
  input: unknown,
  previous?: InteractionProgress,
): InteractionProgress | null {
  const parsed = interactionResponseSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.interactionType !== definition.interactionType
  )
    return null;
  const response = parsed.data;
  switch (definition.interactionType) {
    case 'observe_hotspots': {
      if (response.interactionType !== 'observe_hotspots') return null;
      const visited = response.visitedMaterialIds;
      if (visited.some((id) => !definition.requiredMaterialIds.includes(id)))
        return null;
      if (
        previous?.response.interactionType === 'observe_hotspots' &&
        previous.response.visitedMaterialIds.some((id) => !visited.includes(id))
      )
        return null;
      if (
        definition.visitOrder === 'listed' &&
        visited.some(
          (id, index) => definition.requiredMaterialIds[index] !== id,
        )
      )
        return null;
      return {
        response,
        complete: same(visited, definition.requiredMaterialIds),
        correct: true,
      };
    }
    case 'sort_sequence': {
      if (
        response.interactionType !== 'sort_sequence' ||
        !same(
          response.orderedChoiceIds,
          definition.choices.map((r) => r.choiceId),
        )
      )
        return null;
      return {
        response,
        complete: true,
        correct: response.orderedChoiceIds.every(
          (id, index) => definition.correctOrder[index] === id,
        ),
      };
    }
    case 'evidence_selection': {
      if (
        response.interactionType !== 'evidence_selection' ||
        !definition.choices.some(
          (r) => r.choiceId === response.selectedChoiceId,
        )
      )
        return null;
      return {
        response,
        complete: true,
        correct: response.selectedChoiceId === definition.correctChoiceId,
      };
    }
    case 'material_matching': {
      if (
        response.interactionType !== 'material_matching' ||
        !same(
          response.pairs.map((r) => r.materialId),
          definition.materials.map((r) => r.materialId),
        ) ||
        !same(
          response.pairs.map((r) => r.conclusionId),
          definition.conclusions.map((r) => r.conclusionId),
        )
      )
        return null;
      return {
        response,
        complete: true,
        correct: response.pairs.every((pair) =>
          definition.correctPairs.some(
            (r) =>
              r.materialId === pair.materialId &&
              r.conclusionId === pair.conclusionId,
          ),
        ),
      };
    }
    case 'classify_source': {
      if (
        response.interactionType !== 'classify_source' ||
        !same(
          response.classifications.map((r) => r.materialId),
          definition.materials.map((r) => r.materialId),
        )
      )
        return null;
      return {
        response,
        complete: true,
        correct: response.classifications.every((choice) =>
          definition.correctClassifications.some(
            (r) =>
              r.materialId === choice.materialId &&
              r.category === choice.category,
          ),
        ),
      };
    }
  }
}
