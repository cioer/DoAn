import { DemoPersona } from '../constants/demo-personas';

/**
 * Demo Persona Response Entity
 * Used for returning persona list to frontend
 */
export interface DemoPersonaResponse {
  id: string;
  name: string;
  role: string;
  description: string;
}

/**
 * Switch Persona Response Entity
 * Returns both the original user and the acting-as user
 */
export interface SwitchPersonaResponse {
  user: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    facultyId?: string | null;
    permissions: string[];
  };
  actingAs: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    facultyId?: string | null;
    permissions: string[];
  };
}

/**
 * Demo Mode Config Response
 * Returns demo mode status and available personas
 */
export interface DemoModeConfigResponse {
  enabled: boolean;
  personas: DemoPersonaResponse[];
}
