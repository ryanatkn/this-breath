// This Breath is a minimal tool for breathing exercises and breath visualization.
// There are two source files - the TypeScript source is `app.ts`
// and the compiled JavaScript is `app.js`, which is included in `index.html`.
// The code isn't great - only a little thought went into organizing it,
// and I'm ignoring a lot of best practices like avoiding globals.

//  TODO
// pulse the vessel for better visual effect (needs to use something like a sine wave)

const canvasEl = getElById<HTMLCanvasElement>('space');
const ctx = canvasEl.getContext('2d');
if (!ctx) throw Error('Failed to get canvas context');

interface Circle {
  radius: number;
  color: string;
}
interface BreathingState {
  type: BreathingStateType;
  duration: number;
}
enum BreathingStateType {
  Inhaling,
  Inhaled,
  Exhaling,
  Exhaled,
}
interface Memory {
  size: number; // % of vessel size (to handle dynamic screen resizing easily)
  color: string;
}
type ColorToggle = 'rainbow' | 'custom';

interface State {
  [key: string]: any;
  running: boolean;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  colorCount: number;
  colorSaturation: number;
  colorLightness: number;
  colorToggle: ColorToggle;
  colors: string[];
  customColorsStr: string;
  currentColorIndex: number;
  vesselSizePct: number;
  vessel: Circle;
  breath: Circle;
  memories: Memory[];
  memoryDissipationRate: number; // memory growth acceleration rate
  memoryDissipationRateMultiplier: number; // memory growth acceleration rate
  memoryCount: number;
  currentBreathingStateIndex: number;
  currentBreathingStateTimer: number;
  breathingStatesStr: string;
  breathingStates: BreathingState[];
  breathCurveExponent: number;
  showSettings: boolean;
}
const getDefaultState = (): State => {
  // declaring the type like this prevents extraneous properties due to TypeScript's typechecking heuristics
  const defaultState: State = {
    running: true,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    colorCount: 7,
    colorSaturation: 0.5, // [0, 1]
    colorLightness: 0.5, // [0, 1]
    colorToggle: 'rainbow',
    colors: [],
    customColorsStr: 'red; #0f0; rgba(0, 0, 255)',
    currentColorIndex: -1,
    vesselSizePct: 0.61803398875 / 2,
    vessel: {
      radius: 0,
      color: '#f77',
    },
    breath: {
      radius: 100,
      color: 'white',
    },
    memories: [],
    memoryDissipationRate: 0.00007,
    memoryDissipationRateMultiplier: 1,
    memoryCount: 0,
    currentBreathingStateIndex: -1, // start at -1, gets initialized to 0
    currentBreathingStateTimer: 0,
    breathingStatesStr: '6; 1; 6; 1',
    breathingStates: [],
    breathCurveExponent: 1 / 1.9,
    showSettings: false,
  };
  return defaultState;
};
const state = getDefaultState();

const getNextBreathingStateType = (
  breathingStateType: BreathingStateType | undefined,
): BreathingStateType => {
  if (breathingStateType === undefined) return 0;
  return (
    Number(
      BreathingStateType[BreathingStateType[breathingStateType + 1] as any],
    ) || 0
  );
};

const getCurrentBreathingState = () =>
  state.breathingStates[state.currentBreathingStateIndex];
const nextBreathingState = () => {
  state.currentBreathingStateIndex++;
  if (state.currentBreathingStateIndex >= state.breathingStates.length) {
    state.currentBreathingStateIndex = 0;
  }
  const currentBreathingState = getCurrentBreathingState().type;
  switch (currentBreathingState) {
    case BreathingStateType.Exhaling:
      addCleansingMemoryIfNeeded();
      nextColor();
      break;
    case BreathingStateType.Exhaled:
      break;
    case BreathingStateType.Inhaling:
      break;
    case BreathingStateType.Inhaled:
      break;
    default:
      typeis<never>(currentBreathingState);
  }
};

const getCurrentColor = () => state.colors[state.currentColorIndex];
const nextColor = () => {
  state.currentColorIndex++;
  if (state.currentColorIndex >= state.colors.length) {
    state.currentColorIndex = 0;
  }
  state.vessel.color = getCurrentColor();
};

const createMemory = (color: string): Memory => ({
  color,
  size: 1,
});
const addMemory = (color: string): Memory => {
  const memory = createMemory(color);
  state.memories.push(memory);
  updateMemoryCount(state.memoryCount + 1);
  return memory;
};
const getCleansingMemoryColor = () => state.breath.color;
const addCleansingMemoryIfNeeded = (): Memory | undefined => {
  const latestMemory = state.memories[state.memories.length - 1];
  if (!latestMemory || latestMemory.color === getCleansingMemoryColor()) return;
  return addMemory(getCleansingMemoryColor());
};
const getMemoryRadius = (memory: Memory) => {
  return state.vessel.radius * memory.size;
};

const drawCircle = (circle: Circle) => {
  ctx.beginPath();
  ctx.fillStyle = circle.color;
  ctx.arc(state.centerX, state.centerY, circle.radius, 0, Math.PI * 2);
  ctx.fill();
};
const drawMemory = (memory: Memory) => {
  const radius = getMemoryRadius(memory);
  ctx.beginPath();
  ctx.fillStyle = memory.color;
  ctx.arc(state.centerX, state.centerY, radius, 0, Math.PI * 2);
  ctx.fill();
};

const draw = () => {
  ctx.clearRect(0, 0, state.width, state.height);
  for (const memory of state.memories) {
    drawMemory(memory);
  }
  drawCircle(state.vessel);
  drawCircle(state.breath);
};

const updateBreathingStates = (dt: number) => {
  state.currentBreathingStateTimer -= dt;
  if (state.currentBreathingStateTimer <= 0) {
    nextBreathingState();
    state.currentBreathingStateTimer = getCurrentBreathingState().duration;
  }
};

const updateBreathSize = () => {
  const currentBreathingState = getCurrentBreathingState();
  const {duration} = currentBreathingState;
  const {currentBreathingStateTimer} = state;
  switch (currentBreathingState.type) {
    case BreathingStateType.Inhaling: {
      state.breath.radius =
        state.vessel.radius *
        Math.pow(
          1 - currentBreathingStateTimer / duration,
          state.breathCurveExponent,
        );
      break;
    }
    case BreathingStateType.Inhaled: {
      state.breath.radius = state.vessel.radius + 1;
      break;
    }
    case BreathingStateType.Exhaling: {
      state.breath.radius =
        state.vessel.radius *
        Math.pow(
          currentBreathingStateTimer / duration,
          state.breathCurveExponent,
        );
      break;
    }
    case BreathingStateType.Exhaled: {
      state.breath.radius = 0;
      break;
    }
    default: {
      typeis<never>(currentBreathingState.type);
    }
  }
};

const updateMemorySize = (elapsedTime: number) => {
  for (const memory of state.memories) {
    memory.size +=
      memory.size *
      elapsedTime *
      state.memoryDissipationRate *
      state.memoryDissipationRateMultiplier;
  }
};

// Memories are removed when they're fully covered by other memories
// within the window's viewport.
// A memory fully covers the viewport when its radius is greater than the distance
// from the center point of the screen to one of the corners.
// Cleansing memories can be removed if they're not covering any others.
const removeDistantMemories = () => {
  // Walk the memories list starting at the end.
  // When/if we find a memory that covers the viewport,
  // we remove all memories that come before it in the list.
  const viewportRadius = getViewportRadius();
  let removeMemoriesUpToIndex = -1; // non-inclusive
  for (let i = state.memories.length - 1; i >= 1; i--) {
    const memory = state.memories[i];
    if (getMemoryRadius(memory) > viewportRadius) {
      removeMemoriesUpToIndex = i;
      break;
    }
  }
  if (removeMemoriesUpToIndex <= 0) return;
  const newMemories = state.memories.slice(removeMemoriesUpToIndex);

  // Remove all cleansing memories from the beginning of the list
  // until we reach a non-cleansing memory.
  while (newMemories[0] && newMemories[0].color === getCleansingMemoryColor()) {
    newMemories.shift();
  }

  state.memories = newMemories;
};

const getViewportRadius = (): number => {
  return Math.sqrt(
    Math.pow(state.width / 2, 2) + Math.pow(state.height / 2, 2),
  );
};
const setCanvasSize = () => {
  // First update the state
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.centerX = state.width / 2;
  state.centerY = state.height / 2;
  state.vessel.radius =
    state.vesselSizePct * Math.min(state.width, state.height);

  // Then update the canvas size
  canvasEl.width = state.width;
  canvasEl.height = state.height;
};

const update = (elapsedTime: number) => {
  updateBreathingStates(elapsedTime);
  updateBreathSize();
  updateMemorySize(elapsedTime);
  removeDistantMemories();
  draw();
};

const onCreateMemory = () => {
  addMemory(getCurrentColor());
  nextColor();
};

// Settings ui
const settingsEl = getElById('settings');
const toggleSettings = (showSettings = !state.showSettings) => {
  if (showSettings === state.showSettings) return;
  state.showSettings = showSettings;
  if (showSettings) {
    document.body.classList.add('show-settings');
  } else {
    document.body.classList.remove('show-settings');
  }
};
// Hide settings when clicked in the area outside of the content.
settingsEl.addEventListener('click', e => {
  if (e.target === settingsEl) {
    toggleSettings(false);
  }
});

// Settings toggle
const settingsToggleEl = getElById('settings-toggle');
settingsToggleEl.addEventListener('click', () => {
  toggleSettings();
});
// Always show the settings toggle on load, and hide it after a moment,
// so users know it's there.
setTimeout(() => {
  settingsToggleEl.classList.remove('force-visible');
}, 5000);
// Animate it as it enters the screen to grab that user's attention.
setTimeout(() => {
  settingsToggleEl.classList.remove('initial-state');
}, 800);

// Breathing states setting
const breathingStatesEl = getElById<HTMLInputElement>('breathing-states');
const breathingStatesErrorEl = getElById('breathing-states-error');
const BREATH_TIMING_SEPARATOR = ';';
const BREATHING_STATE_COUNT = 4;
const parseBreathingStatesStr = (value: string): Result<BreathingState[]> => {
  const parts = value
    .split(BREATH_TIMING_SEPARATOR)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {
      ok: false,
      reason: `Breath timings cannot be empty`,
    };
  }
  if (parts.length % BREATHING_STATE_COUNT !== 0) {
    return {
      ok: false,
      reason: `Breath timings must be specified in a multiple of ${BREATHING_STATE_COUNT} comma-separated numbers, but you provided ${
        parts.length
      }`,
    };
  }
  const breathingStates: BreathingState[] = [];
  let lastBreathingStateType: BreathingStateType | undefined;
  for (const part of parts) {
    const value = Number(part) * 1000;
    if (isNaN(value)) {
      return {
        ok: false,
        reason: `Breath timings must be comma separated numbers, but "${part}" doesn't look like a number`,
      };
    }
    lastBreathingStateType = getNextBreathingStateType(lastBreathingStateType);
    breathingStates.push({
      duration: value,
      type: lastBreathingStateType,
    });
  }
  return {ok: true, value: breathingStates};
};
const updateBreathingStateError = (error: string) => {
  breathingStatesErrorEl.innerText = error;
};
const updateBreathingStatesValue = (
  value: string = state.breathingStatesStr,
) => {
  const result = parseBreathingStatesStr(value);
  if (!result.ok) {
    updateBreathingStateError(result.reason);
    return;
  }
  updateBreathingStateError('');
  state.breathingStatesStr = value;
  state.breathingStates = result.value;
  breathingStatesEl.value = value;
};

// Colors settings
const colorSettingsEl = getElById('color-settings');
const rainbowColorsCountSliderEl = getElById<HTMLInputElement>(
  'rainbow-colors-count-slider',
);
const rainbowColorsCountValueEl = getElById('rainbow-colors-count-value');
const rainbowColorsSaturationSliderEl = getElById<HTMLInputElement>(
  'rainbow-colors-saturation-slider',
);
const rainbowColorsSaturationValueEl = getElById(
  'rainbow-colors-saturation-value',
);
const rainbowColorsLightnessSliderEl = getElById<HTMLInputElement>(
  'rainbow-colors-lightness-slider',
);
const rainbowColorsLightnessValueEl = getElById(
  'rainbow-colors-lightness-value',
);
const updateRainbowColorsCountValue = (value: number = state.colorCount) => {
  state.colorCount = value;
  rainbowColorsCountValueEl.innerText = value.toString();
  rainbowColorsCountSliderEl.value = value.toString();
};
const updateRainbowColorsSaturationValue = (
  value: number = state.colorSaturation,
) => {
  state.colorSaturation = value;
  rainbowColorsSaturationValueEl.innerText = formatPct(value);
  rainbowColorsSaturationSliderEl.value = value.toString();
};
const updateRainbowColorsLightnessValue = (
  value: number = state.colorLightness,
) => {
  state.colorLightness = value;
  rainbowColorsLightnessValueEl.innerText = formatPct(value);
  rainbowColorsLightnessSliderEl.value = value.toString();
};
// Color preview
const colorPreviewList = getElById('color-preview-list');
const updateColorPreviewList = () => {
  // Remove all existing nodes
  while (colorPreviewList.lastChild) {
    colorPreviewList.removeChild(colorPreviewList.lastChild);
  }

  // Add a node for each color
  for (const color of state.colors) {
    const el = document.createElement('div');
    el.classList.add('color-preview-item');
    el.style.backgroundColor = color;
    colorPreviewList.appendChild(el);
  }
};
// Color toggle
const rainbowColorsToggleEl = getElById<HTMLInputElement>(
  'rainbow-colors-toggle',
);
const customColorsToggleEl = getElById<HTMLInputElement>(
  'custom-colors-toggle',
);
const updateColorToggle = (colorToggle: ColorToggle = state.colorToggle) => {
  state.colorToggle = colorToggle;
  switch (colorToggle) {
    case 'rainbow':
      rainbowColorsToggleEl.checked = true;
      customColorsToggleEl.checked = false;
      colorSettingsEl.classList.add('rainbow');
      colorSettingsEl.classList.remove('custom');
      break;
    case 'custom':
      customColorsToggleEl.checked = true;
      rainbowColorsToggleEl.checked = false;
      colorSettingsEl.classList.add('custom');
      colorSettingsEl.classList.remove('rainbow');
      break;
    default:
      typeis<never>(colorToggle);
  }
};
// Custom colors
const customColorsEl = getElById<HTMLInputElement>('custom-colors');
const customColorsErrorEl = getElById('custom-colors-error');
const parseCustomColorsStr = (value: string): Result<string[]> => {
  const parts = value
    .split(CUSTOM_COLOR_SEPARATOR)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {
      ok: false,
      reason: `Custom colors cannot be empty`,
    };
  }
  const customColors: string[] = [];
  for (const part of parts) {
    customColors.push(part);
  }
  return {ok: true, value: customColors};
};
const updateCustomColorsError = (error: string) => {
  customColorsErrorEl.innerText = error;
};
const updateCustomColorsValue = (value: string = state.customColorsStr) => {
  const result = parseCustomColorsStr(value);
  if (!result.ok) {
    updateCustomColorsError(result.reason);
  } else {
    updateCustomColorsError('');
  }
  customColorsEl.value = value;
  state.customColorsStr = value;
};

// Update the colors ui
const CUSTOM_COLOR_SEPARATOR = ';';
const setColors = () => {
  switch (state.colorToggle) {
    case 'rainbow': {
      state.colors = new Array(state.colorCount);
      for (let i = 0; i < state.colorCount; i++) {
        state.colors[i] = `hsl(${i * (360 / state.colorCount)}, ${formatPct(
          state.colorSaturation,
        )}, ${formatPct(state.colorLightness)})`;
      }
      break;
    }
    case 'custom': {
      state.colors = state.customColorsStr
        .split(CUSTOM_COLOR_SEPARATOR)
        .map(c => c.trim())
        .filter(Boolean);
      break;
    }
    default:
      typeis<never>(state.colorToggle);
  }
};
// Updates everything, not very clean out of laziness,
// and slower than it needs to be, but it looks like it works fine.
const updateColors = () => {
  updateCustomColorsValue();
  setColors();
  updateColorPreviewList();
  updateColorToggle();
  nextColor(); // show a valid color immediately
};

// Vessel size setting
const vesselSizeSliderEl = getElById<HTMLInputElement>('vessel-size-slider');
const vesselSizeValueEl = getElById('vessel-size-value');
const updateVesselSizeValue = (value: number = state.vesselSizePct) => {
  state.vesselSizePct = value;
  vesselSizeSliderEl.value = value.toString();
  vesselSizeValueEl.innerText = formatPct(value * 2); // is a radius, we want % of screen
  setCanvasSize();
};

// Memory dissipation speed setting
const memorySpeedSliderEl = getElById<HTMLInputElement>('memory-speed-slider');
const memorySpeedValueEl = getElById<HTMLInputElement>('memory-speed-value');
const MIN_MEMORY_DISSIPATION_RATE_MUL = 0.1;
const updateMemorySpeedValue = (
  value: number = state.memoryDissipationRateMultiplier,
) => {
  value = Math.max(value, MIN_MEMORY_DISSIPATION_RATE_MUL);
  state.memoryDissipationRateMultiplier = value;
  memorySpeedSliderEl.value = value.toString();
  memorySpeedValueEl.value = value.toString();
};

// Handle setting form changes
const settingsForm = getElById('settings-form');
settingsForm.addEventListener('input', e => {
  if (e.target === vesselSizeSliderEl) {
    updateVesselSizeValue(Number((e.target as HTMLInputElement).value));
  } else if (
    e.target === memorySpeedSliderEl ||
    e.target === memorySpeedValueEl
  ) {
    const value = Number((e.target as HTMLInputElement).value);
    if (isNaN(value)) return;
    updateMemorySpeedValue(value);
  } else if (e.target === breathingStatesEl) {
    updateBreathingStatesValue((e.target as HTMLInputElement).value);
  } else if (e.target === rainbowColorsCountSliderEl) {
    const value = Number((e.target as HTMLInputElement).value);
    updateRainbowColorsCountValue(value);
  } else if (e.target === rainbowColorsSaturationSliderEl) {
    const value = Number((e.target as HTMLInputElement).value);
    updateRainbowColorsSaturationValue(value);
  } else if (e.target === rainbowColorsLightnessSliderEl) {
    const value = Number((e.target as HTMLInputElement).value);
    updateRainbowColorsLightnessValue(value);
  } else if (e.target === rainbowColorsToggleEl) {
    updateColorToggle('rainbow');
  } else if (e.target === customColorsToggleEl) {
    updateColorToggle('custom');
  } else if (e.target === customColorsEl) {
    updateCustomColorsValue((e.target as HTMLInputElement).value);
  }
  // These ought to be more granular, but the lazy thing works well enough.
  updateColors();
  putSettingsToHash(state);
});

const initSettings = () => {
  updateVesselSizeValue();
  updateBreathingStatesValue();
  updateMemorySpeedValue();
  updateColorToggle();
  updateRainbowColorsCountValue();
  updateRainbowColorsSaturationValue();
  updateRainbowColorsLightnessValue();
  updateColors();
};

// A little type helper to get exhaustive checks on closed type sets.
// For example, if you add a new state to `BreathingStateType`, you'll get type
// errors everywhere it's used in a switch statement.
function typeis<T>(t: T): T {
  return t;
}
type Result<T> = SuccessResult<T> | ErrorResult;
interface SuccessResult<T> {
  ok: true;
  value: T;
}
interface ErrorResult {
  ok: false;
  reason: string;
}

// Formatting helpers
function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// DOM helpers
function getElById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw Error(`Unable to find element with id "${id}"`);
  return el as T;
}

// Settings serialization and sync with hash
interface SavedSettings {
  [key: string]: any;
  colorCount: number;
  colorSaturation: number;
  colorLightness: number;
  colorToggle: ColorToggle;
  customColorsStr: string;
  vesselSizePct: number;
  memoryDissipationRateMultiplier: number; // memory growth acceleration rate
  breathingStatesStr: string;
}
const serializeSettings = (state: State): string => {
  const savedSettings: SavedSettings = {
    colorCount: state.colorCount,
    colorSaturation: state.colorSaturation,
    colorLightness: state.colorLightness,
    colorToggle: state.colorToggle,
    customColorsStr: state.customColorsStr,
    vesselSizePct: state.vesselSizePct,
    memoryDissipationRateMultiplier: state.memoryDissipationRateMultiplier,
    breathingStatesStr: state.breathingStatesStr,
  };
  const str = encodeURIComponent(JSON.stringify(savedSettings));
  return str;
};
const deserializeSettings = (str: string): Result<SavedSettings> => {
  try {
    return {ok: true, value: JSON.parse(decodeURIComponent(str))};
  } catch (err) {
    return {ok: false, reason: 'Failed to parse JSON'};
  }
};
const putSettingsToHash = (state: State) => {
  window.location.replace(`#${serializeSettings(state)}`);
};
const loadSettingsFromHash = (state: State) => {
  const hash = window.location.hash.replace(/^#/, '');

  // Prevent reacting to hash changes that we cause
  // when changing settings inside the app.
  if (!hash || hash === serializeSettings(state)) return;

  const result = deserializeSettings(hash);
  if (!result.ok) {
    // Failed to get the settings from the hash,
    // so let's clear it to avoid a broken experience.
    window.location.replace('#');
    return;
  }

  // Merge the deserialized settings into the state.
  for (const key in result.value) {
    state[key] = result.value[key];
  }
  initSettings();
};
window.addEventListener('hashchange', () => {
  loadSettingsFromHash(state);
});

// Reset settings button
const resetSettingsButtonEl = getElById('reset-settings-button');
resetSettingsButtonEl.addEventListener('click', () => {
  if (!confirm('Are you sure you want to reset all settings?')) return;
  putSettingsToHash(getDefaultState());
});

// Memory count
const memoryCountEl = getElById('memory-count');
const updateMemoryCount = (memoryCount = state.memoryCount) => {
  state.memoryCount = memoryCount;
  memoryCountEl.innerText = memoryCount.toString();
};

// Event listeners
window.addEventListener('resize', () => {
  setCanvasSize();
  draw();
});
canvasEl.addEventListener('click', () => {
  onCreateMemory();
});
document.addEventListener('keydown', e => {
  // We want to allow any key except Escape to create memories,
  // unless we're inside an input.
  if ((e.target as any).tagName === 'INPUT') return;
  if (e.key === 'Escape') {
    toggleSettings();
  } else {
    onCreateMemory();
  }
});

// Main loop
let lastTime: number = 0;
const onFrame = (t: number) => {
  if (lastTime) {
    const elapsedTime = t - lastTime;
    update(elapsedTime);
  }
  lastTime = t;
  if (state.running) {
    requestAnimationFrame(onFrame);
  }
};

// Initialization
const init = () => {
  loadSettingsFromHash(state);
  initSettings();
  setCanvasSize();
  state.currentColorIndex = state.colors.length - 1;
  nextBreathingState();
  draw();
  requestAnimationFrame(onFrame);
};

// Do
init();
