import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import type { PcoState } from './client.js'

export const VARIABLE_DEFINITIONS: CompanionVariableDefinition[] = [
  { variableId: 'current_mode', name: 'Current Mode' },
  { variableId: 'current_url', name: 'Current URL' },
  { variableId: 'current_preset_name', name: 'Current Preset Name' },
  { variableId: 'slide_index', name: 'Current Slide Number (1-based)' },
  { variableId: 'slide_count', name: 'Total Slide Count' },
  { variableId: 'deck_title', name: 'Slide Deck Title' },
  { variableId: 'l3_active_cue', name: 'Active Lower Third Cue' },
  { variableId: 'l3_stacking', name: 'Lower Third Stacking (on/off)' },
  { variableId: 'ab_active_instance', name: 'Active A/B Instance' },
  { variableId: 'connected', name: 'Connected (1/0)' },
  { variableId: 'connection_status', name: 'Connection Status' },
]

export function stateToVariables(state: Partial<PcoState>, connected: boolean): CompanionVariableValues {
  return {
    current_mode: state.currentMode ?? 'idle',
    current_url: state.currentUrl ?? '',
    current_preset_name: state.currentPreset?.name ?? '',
    slide_index: state.slides != null ? String(state.slides.slideIndex + 1) : '',
    slide_count: state.slides != null ? String(state.slides.slideCount) : '',
    deck_title: state.slides?.deckTitle ?? '',
    l3_active_cue: state.l3?.activeCueName ?? '',
    l3_stacking: state.l3?.isStacking ? 'on' : 'off',
    ab_active_instance: state.abState?.activeInstance ?? 'A',
    connected: connected ? '1' : '0',
    connection_status: connected ? 'connected' : 'disconnected',
  }
}
