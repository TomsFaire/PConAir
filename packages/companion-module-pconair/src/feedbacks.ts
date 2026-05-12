import { combineRgb, type CompanionFeedbackDefinition } from '@companion-module/base'

export type GetVariableValue = (id: string) => string | undefined

export function buildFeedbacks(getVar: GetVariableValue): Record<string, CompanionFeedbackDefinition> {
  return {
    is_connected: {
      type: 'boolean',
      name: 'Is Connected',
      description: 'Green when connected to PC On Air, red when disconnected',
      defaultStyle: { bgcolor: combineRgb(0, 200, 0), color: combineRgb(255, 255, 255) },
      options: [],
      callback: () => getVar('connected') === '1',
    },

    is_mode: {
      type: 'boolean',
      name: 'Is Mode Active',
      description: 'Highlights when the specified mode is active',
      defaultStyle: { bgcolor: combineRgb(0, 200, 200), color: combineRgb(255, 255, 255) },
      options: [
        {
          type: 'dropdown',
          id: 'mode',
          label: 'Mode',
          default: 'slides',
          choices: [
            { id: 'slides', label: 'Slides' },
            { id: 'url', label: 'URL' },
            { id: 'l3', label: 'Lower Thirds' },
            { id: 'idle', label: 'Idle' },
          ],
        },
      ],
      callback: ({ options }) => getVar('current_mode') === options['mode'],
    },

    is_ab_instance: {
      type: 'boolean',
      name: 'Is A/B Instance Active',
      description: 'Highlights when the specified A/B instance is active',
      defaultStyle: { bgcolor: combineRgb(200, 160, 0), color: combineRgb(255, 255, 255) },
      options: [
        {
          type: 'dropdown',
          id: 'instance',
          label: 'Instance',
          default: 'A',
          choices: [
            { id: 'A', label: 'Instance A' },
            { id: 'B', label: 'Instance B' },
          ],
        },
      ],
      callback: ({ options }) => getVar('ab_active_instance') === options['instance'],
    },

    slide_at: {
      type: 'boolean',
      name: 'At Slide Number',
      description: 'Highlights when the current slide matches the configured number',
      defaultStyle: { bgcolor: combineRgb(0, 180, 0), color: combineRgb(255, 255, 255) },
      options: [
        {
          type: 'number',
          id: 'slide_number',
          label: 'Slide Number (1-based)',
          default: 1,
          min: 1,
          max: 9999,
        },
      ],
      callback: ({ options }) => getVar('slide_index') === String(options['slide_number']),
    },

    l3_stacking_active: {
      type: 'boolean',
      name: 'Lower Third Stacking On',
      description: 'Highlights when lower third stacking mode is enabled',
      defaultStyle: { bgcolor: combineRgb(200, 100, 0), color: combineRgb(255, 255, 255) },
      options: [],
      callback: () => getVar('l3_stacking') === 'on',
    },

    l3_has_active_cue: {
      type: 'boolean',
      name: 'Has Active Lower Third Cue',
      description: 'Highlights when any lower third cue is currently on-air',
      defaultStyle: { bgcolor: combineRgb(120, 0, 180), color: combineRgb(255, 255, 255) },
      options: [],
      callback: () => Boolean(getVar('l3_active_cue')),
    },
  }
}
