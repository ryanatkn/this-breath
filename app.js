"use strict";
// This Breath is a minimal tool for breathing exercises and breath visualization.
// There are two source files - the TypeScript source is `app.ts`
// and the compiled JavaScript is `app.js`, which is included in `index.html`.
// The code isn't great - only a little thought went into organizing it,
// and I'm ignoring a lot of best practices like avoiding globals.
//  TODO
// pulse the vessel for better visual effect (needs to use something like a sine wave)
var canvasEl = getElById('space');
var ctx = canvasEl.getContext('2d');
if (!ctx)
    throw Error('Failed to get canvas context');
var BreathingStateType;
(function (BreathingStateType) {
    BreathingStateType[BreathingStateType["Inhaling"] = 0] = "Inhaling";
    BreathingStateType[BreathingStateType["Inhaled"] = 1] = "Inhaled";
    BreathingStateType[BreathingStateType["Exhaling"] = 2] = "Exhaling";
    BreathingStateType[BreathingStateType["Exhaled"] = 3] = "Exhaled";
})(BreathingStateType || (BreathingStateType = {}));
var getDefaultState = function () {
    // declaring the type like this prevents extraneous properties due to TypeScript's typechecking heuristics
    var defaultState = {
        running: true,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0,
        colorCount: 7,
        colorSaturation: 0.5,
        colorLightness: 0.5,
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
        currentBreathingStateIndex: -1,
        currentBreathingStateTimer: 0,
        breathingStatesStr: '6; 1; 6; 1',
        breathingStates: [],
        breathCurveExponent: 1 / 1.9,
        showSettings: false,
    };
    return defaultState;
};
var state = getDefaultState();
var getNextBreathingStateType = function (breathingStateType) {
    if (breathingStateType === undefined)
        return 0;
    return (Number(BreathingStateType[BreathingStateType[breathingStateType + 1]]) || 0);
};
var getCurrentBreathingState = function () {
    return state.breathingStates[state.currentBreathingStateIndex];
};
var nextBreathingState = function () {
    state.currentBreathingStateIndex++;
    if (state.currentBreathingStateIndex >= state.breathingStates.length) {
        state.currentBreathingStateIndex = 0;
    }
    var currentBreathingState = getCurrentBreathingState().type;
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
            typeis(currentBreathingState);
    }
};
var getCurrentColor = function () { return state.colors[state.currentColorIndex]; };
var nextColor = function () {
    state.currentColorIndex++;
    if (state.currentColorIndex >= state.colors.length) {
        state.currentColorIndex = 0;
    }
    state.vessel.color = getCurrentColor();
};
var createMemory = function (color) { return ({
    color: color,
    size: 1,
}); };
var addMemory = function (color) {
    var memory = createMemory(color);
    state.memories.push(memory);
    updateMemoryCount(state.memoryCount + 1);
    return memory;
};
var getCleansingMemoryColor = function () { return state.breath.color; };
var addCleansingMemoryIfNeeded = function () {
    var latestMemory = state.memories[state.memories.length - 1];
    if (!latestMemory || latestMemory.color === getCleansingMemoryColor())
        return;
    return addMemory(getCleansingMemoryColor());
};
var getMemoryRadius = function (memory) {
    return state.vessel.radius * memory.size;
};
var drawCircle = function (circle) {
    ctx.beginPath();
    ctx.fillStyle = circle.color;
    ctx.arc(state.centerX, state.centerY, circle.radius, 0, Math.PI * 2);
    ctx.fill();
};
var drawMemory = function (memory) {
    var radius = getMemoryRadius(memory);
    ctx.beginPath();
    ctx.fillStyle = memory.color;
    ctx.arc(state.centerX, state.centerY, radius, 0, Math.PI * 2);
    ctx.fill();
};
var draw = function () {
    ctx.clearRect(0, 0, state.width, state.height);
    for (var _i = 0, _a = state.memories; _i < _a.length; _i++) {
        var memory = _a[_i];
        drawMemory(memory);
    }
    drawCircle(state.vessel);
    drawCircle(state.breath);
};
var updateBreathingStates = function (dt) {
    state.currentBreathingStateTimer -= dt;
    if (state.currentBreathingStateTimer <= 0) {
        nextBreathingState();
        state.currentBreathingStateTimer = getCurrentBreathingState().duration;
    }
};
var updateBreathSize = function () {
    var currentBreathingState = getCurrentBreathingState();
    var duration = currentBreathingState.duration;
    var currentBreathingStateTimer = state.currentBreathingStateTimer;
    switch (currentBreathingState.type) {
        case BreathingStateType.Inhaling: {
            state.breath.radius =
                state.vessel.radius *
                    Math.pow(1 - currentBreathingStateTimer / duration, state.breathCurveExponent);
            break;
        }
        case BreathingStateType.Inhaled: {
            state.breath.radius = state.vessel.radius + 1;
            break;
        }
        case BreathingStateType.Exhaling: {
            state.breath.radius =
                state.vessel.radius *
                    Math.pow(currentBreathingStateTimer / duration, state.breathCurveExponent);
            break;
        }
        case BreathingStateType.Exhaled: {
            state.breath.radius = 0;
            break;
        }
        default: {
            typeis(currentBreathingState.type);
        }
    }
};
var updateMemorySize = function (elapsedTime) {
    for (var _i = 0, _a = state.memories; _i < _a.length; _i++) {
        var memory = _a[_i];
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
var removeDistantMemories = function () {
    // Walk the memories list starting at the end.
    // When/if we find a memory that covers the viewport,
    // we remove all memories that come before it in the list.
    var viewportRadius = getViewportRadius();
    var removeMemoriesUpToIndex = -1; // non-inclusive
    for (var i = state.memories.length - 1; i >= 1; i--) {
        var memory = state.memories[i];
        if (getMemoryRadius(memory) > viewportRadius) {
            removeMemoriesUpToIndex = i;
            break;
        }
    }
    if (removeMemoriesUpToIndex <= 0)
        return;
    var newMemories = state.memories.slice(removeMemoriesUpToIndex);
    // Remove all cleansing memories from the beginning of the list
    // until we reach a non-cleansing memory.
    while (newMemories[0] && newMemories[0].color === getCleansingMemoryColor()) {
        newMemories.shift();
    }
    state.memories = newMemories;
};
var getViewportRadius = function () {
    return Math.sqrt(Math.pow(state.width / 2, 2) + Math.pow(state.height / 2, 2));
};
var setCanvasSize = function () {
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
var update = function (elapsedTime) {
    updateBreathingStates(elapsedTime);
    updateBreathSize();
    updateMemorySize(elapsedTime);
    removeDistantMemories();
    draw();
};
var onCreateMemory = function () {
    addMemory(getCurrentColor());
    nextColor();
};
// Settings ui
var settingsEl = getElById('settings');
var toggleSettings = function (showSettings) {
    if (showSettings === void 0) { showSettings = !state.showSettings; }
    if (showSettings === state.showSettings)
        return;
    state.showSettings = showSettings;
    if (showSettings) {
        document.body.classList.add('show-settings');
    }
    else {
        document.body.classList.remove('show-settings');
    }
};
// Hide settings when clicked in the area outside of the content.
settingsEl.addEventListener('click', function (e) {
    if (e.target === settingsEl) {
        toggleSettings(false);
    }
});
// Settings toggle
var settingsToggleEl = getElById('settings-toggle');
settingsToggleEl.addEventListener('click', function () {
    toggleSettings();
});
// Always show the settings toggle on load, and hide it after a moment,
// so users know it's there.
setTimeout(function () {
    settingsToggleEl.classList.remove('force-visible');
}, 5000);
// Animate it as it enters the screen to grab that user's attention.
setTimeout(function () {
    settingsToggleEl.classList.remove('initial-state');
}, 800);
// Breathing states setting
var breathingStatesEl = getElById('breathing-states');
var breathingStatesErrorEl = getElById('breathing-states-error');
var BREATH_TIMING_SEPARATOR = ';';
var BREATHING_STATE_COUNT = 4;
var parseBreathingStatesStr = function (value) {
    var parts = value
        .split(BREATH_TIMING_SEPARATOR)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    if (parts.length === 0) {
        return {
            ok: false,
            reason: "Breath timings cannot be empty",
        };
    }
    if (parts.length % BREATHING_STATE_COUNT !== 0) {
        return {
            ok: false,
            reason: "Breath timings must be specified in a multiple of " + BREATHING_STATE_COUNT + " comma-separated numbers, but you provided " + parts.length,
        };
    }
    var breathingStates = [];
    var lastBreathingStateType;
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        var value_1 = Number(part) * 1000;
        if (isNaN(value_1)) {
            return {
                ok: false,
                reason: "Breath timings must be comma separated numbers, but \"" + part + "\" doesn't look like a number",
            };
        }
        lastBreathingStateType = getNextBreathingStateType(lastBreathingStateType);
        breathingStates.push({
            duration: value_1,
            type: lastBreathingStateType,
        });
    }
    return { ok: true, value: breathingStates };
};
var updateBreathingStateError = function (error) {
    breathingStatesErrorEl.innerText = error;
};
var updateBreathingStatesValue = function (value) {
    if (value === void 0) { value = state.breathingStatesStr; }
    var result = parseBreathingStatesStr(value);
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
var colorSettingsEl = getElById('color-settings');
var rainbowColorsCountSliderEl = getElById('rainbow-colors-count-slider');
var rainbowColorsCountValueEl = getElById('rainbow-colors-count-value');
var rainbowColorsSaturationSliderEl = getElById('rainbow-colors-saturation-slider');
var rainbowColorsSaturationValueEl = getElById('rainbow-colors-saturation-value');
var rainbowColorsLightnessSliderEl = getElById('rainbow-colors-lightness-slider');
var rainbowColorsLightnessValueEl = getElById('rainbow-colors-lightness-value');
var updateRainbowColorsCountValue = function (value) {
    if (value === void 0) { value = state.colorCount; }
    state.colorCount = value;
    rainbowColorsCountValueEl.innerText = value.toString();
    rainbowColorsCountSliderEl.value = value.toString();
};
var updateRainbowColorsSaturationValue = function (value) {
    if (value === void 0) { value = state.colorSaturation; }
    state.colorSaturation = value;
    rainbowColorsSaturationValueEl.innerText = formatPct(value);
    rainbowColorsSaturationSliderEl.value = value.toString();
};
var updateRainbowColorsLightnessValue = function (value) {
    if (value === void 0) { value = state.colorLightness; }
    state.colorLightness = value;
    rainbowColorsLightnessValueEl.innerText = formatPct(value);
    rainbowColorsLightnessSliderEl.value = value.toString();
};
// Color preview
var colorPreviewList = getElById('color-preview-list');
var updateColorPreviewList = function () {
    // Remove all existing nodes
    while (colorPreviewList.lastChild) {
        colorPreviewList.removeChild(colorPreviewList.lastChild);
    }
    // Add a node for each color
    for (var _i = 0, _a = state.colors; _i < _a.length; _i++) {
        var color = _a[_i];
        var el = document.createElement('div');
        el.classList.add('color-preview-item');
        el.style.backgroundColor = color;
        colorPreviewList.appendChild(el);
    }
};
// Color toggle
var rainbowColorsToggleEl = getElById('rainbow-colors-toggle');
var customColorsToggleEl = getElById('custom-colors-toggle');
var updateColorToggle = function (colorToggle) {
    if (colorToggle === void 0) { colorToggle = state.colorToggle; }
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
            typeis(colorToggle);
    }
};
// Custom colors
var customColorsEl = getElById('custom-colors');
var customColorsErrorEl = getElById('custom-colors-error');
var parseCustomColorsStr = function (value) {
    var parts = value
        .split(CUSTOM_COLOR_SEPARATOR)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    if (parts.length === 0) {
        return {
            ok: false,
            reason: "Custom colors cannot be empty",
        };
    }
    var customColors = [];
    for (var _i = 0, parts_2 = parts; _i < parts_2.length; _i++) {
        var part = parts_2[_i];
        customColors.push(part);
    }
    return { ok: true, value: customColors };
};
var updateCustomColorsError = function (error) {
    customColorsErrorEl.innerText = error;
};
var updateCustomColorsValue = function (value) {
    if (value === void 0) { value = state.customColorsStr; }
    var result = parseCustomColorsStr(value);
    if (!result.ok) {
        updateCustomColorsError(result.reason);
    }
    else {
        updateCustomColorsError('');
    }
    customColorsEl.value = value;
    state.customColorsStr = value;
};
// Update the colors ui
var CUSTOM_COLOR_SEPARATOR = ';';
var setColors = function () {
    switch (state.colorToggle) {
        case 'rainbow': {
            state.colors = new Array(state.colorCount);
            for (var i = 0; i < state.colorCount; i++) {
                state.colors[i] = "hsl(" + i * (360 / state.colorCount) + ", " + formatPct(state.colorSaturation) + ", " + formatPct(state.colorLightness) + ")";
            }
            break;
        }
        case 'custom': {
            state.colors = state.customColorsStr
                .split(CUSTOM_COLOR_SEPARATOR)
                .map(function (c) { return c.trim(); })
                .filter(Boolean);
            break;
        }
        default:
            typeis(state.colorToggle);
    }
};
// Updates everything, not very clean out of laziness,
// and slower than it needs to be, but it looks like it works fine.
var updateColors = function () {
    updateCustomColorsValue();
    setColors();
    updateColorPreviewList();
    updateColorToggle();
    nextColor(); // show a valid color immediately
};
// Vessel size setting
var vesselSizeSliderEl = getElById('vessel-size-slider');
var vesselSizeValueEl = getElById('vessel-size-value');
var updateVesselSizeValue = function (value) {
    if (value === void 0) { value = state.vesselSizePct; }
    state.vesselSizePct = value;
    vesselSizeSliderEl.value = value.toString();
    vesselSizeValueEl.innerText = formatPct(value * 2); // is a radius, we want % of screen
    setCanvasSize();
};
// Memory dissipation speed setting
var memorySpeedSliderEl = getElById('memory-speed-slider');
var memorySpeedValueEl = getElById('memory-speed-value');
var MIN_MEMORY_DISSIPATION_RATE_MUL = 0.1;
var updateMemorySpeedValue = function (value) {
    if (value === void 0) { value = state.memoryDissipationRateMultiplier; }
    value = Math.max(value, MIN_MEMORY_DISSIPATION_RATE_MUL);
    state.memoryDissipationRateMultiplier = value;
    memorySpeedSliderEl.value = value.toString();
    memorySpeedValueEl.value = value.toString();
};
// Handle setting form changes
var settingsForm = getElById('settings-form');
settingsForm.addEventListener('input', function (e) {
    if (e.target === vesselSizeSliderEl) {
        updateVesselSizeValue(Number(e.target.value));
    }
    else if (e.target === memorySpeedSliderEl ||
        e.target === memorySpeedValueEl) {
        var value = Number(e.target.value);
        if (isNaN(value))
            return;
        updateMemorySpeedValue(value);
    }
    else if (e.target === breathingStatesEl) {
        updateBreathingStatesValue(e.target.value);
    }
    else if (e.target === rainbowColorsCountSliderEl) {
        var value = Number(e.target.value);
        updateRainbowColorsCountValue(value);
    }
    else if (e.target === rainbowColorsSaturationSliderEl) {
        var value = Number(e.target.value);
        updateRainbowColorsSaturationValue(value);
    }
    else if (e.target === rainbowColorsLightnessSliderEl) {
        var value = Number(e.target.value);
        updateRainbowColorsLightnessValue(value);
    }
    else if (e.target === rainbowColorsToggleEl) {
        updateColorToggle('rainbow');
    }
    else if (e.target === customColorsToggleEl) {
        updateColorToggle('custom');
    }
    else if (e.target === customColorsEl) {
        updateCustomColorsValue(e.target.value);
    }
    // These ought to be more granular, but the lazy thing works well enough.
    updateColors();
    putSettingsToHash(state);
});
var initSettings = function () {
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
function typeis(t) {
    return t;
}
// Formatting helpers
function formatPct(value) {
    return Math.round(value * 100) + "%";
}
// DOM helpers
function getElById(id) {
    var el = document.getElementById(id);
    if (!el)
        throw Error("Unable to find element with id \"" + id + "\"");
    return el;
}
var serializeSettings = function (state) {
    var savedSettings = {
        colorCount: state.colorCount,
        colorSaturation: state.colorSaturation,
        colorLightness: state.colorLightness,
        colorToggle: state.colorToggle,
        customColorsStr: state.customColorsStr,
        vesselSizePct: state.vesselSizePct,
        memoryDissipationRateMultiplier: state.memoryDissipationRateMultiplier,
        breathingStatesStr: state.breathingStatesStr,
    };
    var str = encodeURIComponent(JSON.stringify(savedSettings));
    return str;
};
var deserializeSettings = function (str) {
    try {
        return { ok: true, value: JSON.parse(decodeURIComponent(str)) };
    }
    catch (err) {
        return { ok: false, reason: 'Failed to parse JSON' };
    }
};
var putSettingsToHash = function (state) {
    window.location.replace("#" + serializeSettings(state));
};
var loadSettingsFromHash = function (state) {
    var hash = window.location.hash.replace(/^#/, '');
    // Prevent reacting to hash changes that we cause
    // when changing settings inside the app.
    if (!hash || hash === serializeSettings(state))
        return;
    var result = deserializeSettings(hash);
    if (!result.ok) {
        // Failed to get the settings from the hash,
        // so let's clear it to avoid a broken experience.
        window.location.replace('#');
        return;
    }
    // Merge the deserialized settings into the state.
    for (var key in result.value) {
        state[key] = result.value[key];
    }
    initSettings();
};
window.addEventListener('hashchange', function () {
    loadSettingsFromHash(state);
});
// Reset settings button
var resetSettingsButtonEl = getElById('reset-settings-button');
resetSettingsButtonEl.addEventListener('click', function () {
    if (!confirm('Are you sure you want to reset all settings?'))
        return;
    putSettingsToHash(getDefaultState());
});
// Memory count
var memoryCountEl = getElById('memory-count');
var updateMemoryCount = function (memoryCount) {
    if (memoryCount === void 0) { memoryCount = state.memoryCount; }
    state.memoryCount = memoryCount;
    memoryCountEl.innerText = memoryCount.toString();
};
// Event listeners
window.addEventListener('resize', function () {
    setCanvasSize();
    draw();
});
canvasEl.addEventListener('click', function () {
    onCreateMemory();
});
document.addEventListener('keydown', function (e) {
    // We want to allow any key except Escape to create memories,
    // unless we're inside an input.
    if (e.target.tagName === 'INPUT')
        return;
    if (e.key === 'Escape') {
        toggleSettings();
    }
    else {
        onCreateMemory();
    }
});
// Main loop
var lastTime = 0;
var onFrame = function (t) {
    if (lastTime) {
        var elapsedTime = t - lastTime;
        update(elapsedTime);
    }
    lastTime = t;
    if (state.running) {
        requestAnimationFrame(onFrame);
    }
};
// Initialization
var init = function () {
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
