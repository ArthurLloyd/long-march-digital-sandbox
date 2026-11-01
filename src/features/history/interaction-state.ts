import type {
  InteractionDefinition,
  InteractionResponse,
} from '../../shared/contracts';

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((id) => b.includes(id));
/** UI feedback only. C independently validates responses and owns completion. */
export function assessResponse(
  d: InteractionDefinition,
  r: InteractionResponse | null,
): { complete: boolean; correct: boolean } {
  const no = { complete: false, correct: false };
  if (!r || d.interactionType !== r.interactionType) return no;
  switch (d.interactionType) {
    case 'observe_hotspots': {
      if (r.interactionType !== 'observe_hotspots') return no;
      const complete =
        same(r.visitedMaterialIds, d.requiredMaterialIds) &&
        (d.visitOrder !== 'listed' ||
          r.visitedMaterialIds.every(
            (id, i) => id === d.requiredMaterialIds[i],
          ));
      return { complete, correct: complete };
    }
    case 'sort_sequence': {
      if (r.interactionType !== 'sort_sequence') return no;
      const complete = same(
        r.orderedChoiceIds,
        d.choices.map((c) => c.choiceId),
      );
      return {
        complete,
        correct:
          complete &&
          r.orderedChoiceIds.every((id, i) => id === d.correctOrder[i]),
      };
    }
    case 'evidence_selection': {
      if (r.interactionType !== 'evidence_selection') return no;
      return {
        complete: d.choices.some((c) => c.choiceId === r.selectedChoiceId),
        correct: r.selectedChoiceId === d.correctChoiceId,
      };
    }
    case 'material_matching': {
      if (r.interactionType !== 'material_matching') return no;
      const complete =
        same(
          r.pairs.map((p) => p.materialId),
          d.materials.map((m) => m.materialId),
        ) &&
        same(
          r.pairs.map((p) => p.conclusionId),
          d.conclusions.map((c) => c.conclusionId),
        );
      return {
        complete,
        correct:
          complete &&
          r.pairs.every((p) =>
            d.correctPairs.some(
              (c) =>
                c.materialId === p.materialId &&
                c.conclusionId === p.conclusionId,
            ),
          ),
      };
    }
    case 'classify_source': {
      if (r.interactionType !== 'classify_source') return no;
      const complete =
        same(
          r.classifications.map((c) => c.materialId),
          d.materials.map((m) => m.materialId),
        ) &&
        r.classifications.every((c) =>
          [
            'primary_source',
            'editorial_summary',
            'artistic_recreation',
          ].includes(c.category),
        );
      return {
        complete,
        correct:
          complete &&
          r.classifications.every((p) =>
            d.correctClassifications.some(
              (c) => c.materialId === p.materialId && c.category === p.category,
            ),
          ),
      };
    }
  }
}
