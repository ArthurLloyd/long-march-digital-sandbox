import type { ExperienceModules } from '../../app/experience/experience-modules';
import {
  EngineeringRenderer,
  EngineeringTeaching,
  EngineeringEquivalent,
  EngineeringDetails,
  EngineeringMap,
} from './C1Modules';
export const engineeringModules: ExperienceModules = {
  Renderer: EngineeringRenderer,
  Teaching: EngineeringTeaching,
  Equivalent: EngineeringEquivalent,
  Details: EngineeringDetails,
  Map: EngineeringMap,
};
