import type {SimulatorEnvironment, SimulatorMode} from '../SimulatorOptions.js';

export interface ISimulatorSettingsPanelElement extends HTMLElement {
  environments: SimulatorEnvironment[];
  activeEnvironmentIndex: number;
  simulatorMode: SimulatorMode;
  handPhysicsAvailable: boolean;
  handPhysicsEnabled: boolean;
}
