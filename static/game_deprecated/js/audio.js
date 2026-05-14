/**
 * NxSiran Game - Enhanced Audio Manager v0.9
 * Web Audio API wrapper with procedural BGM, extended SFX, and volume controls
 */
(function () {
    'use strict';

    // ── Core State ──────────────────────────────────────────────
    var _ctx = null;
    var _enabled = true;
    var _sfxVolume = 0.3;
    var _bgmVolume = 0.15;
    var _muted = false;
    var _masterGain = null;
    var _sfxGain = null;
    var _bgmGain = null;
    var _bgmMasterGain = null;

    // ── BGM State ───────────────────────────────────────────────
    var _currentBGMTrack = null;
    var _bgmNodes = [];          // active oscillator/gain nodes
    var _bgmLoopTimer = null;
    var _bgmFadeTimer = null;
    var _previousTrack = null;   // track to return to after story/shop

    // ── BGM Track Definitions ───────────────────────────────────
    var BGM_TRACKS = {
        'main':  { name: '\u65E5\u5E38', bpm: 72, key: 'C',  mood: 'peaceful',   baseFreq: 261.63 },
        'story': { name: '\u5267\u60C5', bpm: 60, key: 'Am', mood: 'emotional',  baseFreq: 220.00 },
        'shop':  { name: '\u5546\u5E97', bpm: 80, key: 'F',  mood: 'cheerful',   baseFreq: 349.23 },
        'night': { name: '\u591C\u665A', bpm: 50, key: 'Dm', mood: 'melancholic', baseFreq: 293.66 },
        'rain':  { name: '\u96E8\u5929', bpm: 55, key: 'Bm', mood: 'sad',        baseFreq: 246.94 },
        'event': { name: '\u4E8B\u4EF6', bpm: 66, key: 'Em', mood: 'dramatic',   baseFreq: 329.63 }
    };

    // ── Chord Definitions (intervals from root in semitones) ────
    var CHORDS = {
        'C':  [[0, 4, 7],   [5, 9, 12],  [7, 11, 14], [0, 4, 7]],
        'Am': [[0, 3, 7],   [5, 8, 12],  [7, 10, 14], [0, 3, 7]],
        'F':  [[0, 4, 7],   [5, 9, 12],  [7, 11, 14], [0, 4, 7]],
        'Dm': [[0, 3, 7],   [5, 8, 12],  [7, 10, 14], [0, 3, 7]],
        'Bm': [[0, 3, 7],   [5, 8, 12],  [7, 10, 14], [0, 3, 7]],
        'Em': [[0, 3, 7],   [5, 8, 12],  [7, 10, 14], [0, 3, 7]]
    };

    // Melody note pools per mood (semitone offsets from base)
    var MELODY_NOTES = {
        'peaceful':   [0, 2, 4, 7, 9, 12, 14, 16],
        'emotional':  [0, 3, 5, 7, 10, 12, 15, 17],
        'cheerful':   [0, 2, 4, 5, 7, 9, 11, 12],
        'melancholic':[0, 3, 5, 7, 10, 12, 15, 19],
        'sad':        [0, 3, 5, 7, 10, 12, 15, 17],
        'dramatic':   [0, 3, 5, 7, 10, 12, 15, 19]
    };

    // ── Initialize ──────────────────────────────────────────────
    function init() {
        try {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain
            _masterGain = _ctx.createGain();
            _masterGain.gain.value = 1.0;
            _masterGain.connect(_ctx.destination);

            // Create SFX gain node
            _sfxGain = _ctx.createGain();
            _sfxGain.gain.value = _sfxVolume;
            _sfxGain.connect(_masterGain);

            // Create BGM gain nodes (two-stage for crossfade)
            _bgmGain = _ctx.createGain();
            _bgmGain.gain.value = 0;
            _bgmGain.connect(_masterGain);

            _bgmMasterGain = _ctx.createGain();
            _bgmMasterGain.gain.value = _bgmVolume;
            _bgmGain.connect(_bgmMasterGain);
            _bgmMasterGain.connect(_masterGain);

            // Handle visibility change - duck audio when tab hidden
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    if (_bgmMasterGain) {
                        _bgmMasterGain.gain.setTargetAtTime(_bgmVolume * 0.3, _ctx.currentTime, 0.5);
                    }
                } else {
                    if (_bgmMasterGain) {
                        _bgmMasterGain.gain.setTargetAtTime(_bgmVolume, _ctx.currentTime, 0.5);
                    }
                    resumeContext();
                }
            });

            // Resume context on first user interaction
            var resumeOnInteraction = function () {
                resumeContext();
                document.removeEventListener('click', resumeOnInteraction);
                document.removeEventListener('touchstart', resumeOnInteraction);
                document.removeEventListener('keydown', resumeOnInteraction);
            };
            document.addEventListener('click', resumeOnInteraction);
            document.addEventListener('touchstart', resumeOnInteraction);
            document.addEventListener('keydown', resumeOnInteraction);

            console.log('[Audio] Enhanced audio system initialized');
        } catch (e) {
            console.warn('[Audio] Web Audio not supported');
        }
    }

    function resumeContext() {
        if (_ctx && _ctx.state === 'suspended') {
            _ctx.resume();
        }
    }

    function getContext() {
        if (!_ctx) init();
        resumeContext();
        return _ctx;
    }

    // ── SFX: Core Tone Player ───────────────────────────────────
    function playTone(frequency, duration, type) {
        if (!_enabled || _muted) return;
        var ctx = getContext();
        if (!ctx) return;

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = _sfxVolume;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(_sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // ── SFX: Original Sound Effects ─────────────────────────────
    function playPlant() { playTone(440, 0.15, 'sine'); setTimeout(function () { playTone(554, 0.15, 'sine'); }, 100); }
    function playHarvest() { playTone(523, 0.1, 'sine'); setTimeout(function () { playTone(659, 0.1, 'sine'); }, 80); setTimeout(function () { playTone(784, 0.2, 'sine'); }, 160); }
    function playWater() { playTone(300, 0.2, 'sine'); }
    function playBuy() { playTone(600, 0.1, 'square'); setTimeout(function () { playTone(800, 0.15, 'square'); }, 100); }
    function playSell() { playTone(800, 0.1, 'square'); setTimeout(function () { playTone(600, 0.15, 'square'); }, 100); }
    function playError() { playTone(200, 0.3, 'sawtooth'); }
    function playClick() { playTone(1000, 0.05, 'sine'); }

    // ── SFX: Extended Sound Effects (v0.9) ──────────────────────

    /**
     * Warm chime: 3 ascending notes for gift giving
     */
    function playGift() {
        if (!_enabled || _muted) return;
        playTone(523, 0.2, 'sine');
        setTimeout(function () { playTone(659, 0.2, 'sine'); }, 120);
        setTimeout(function () { playTone(784, 0.3, 'sine'); }, 240);
    }

    /**
     * Fanfare: quick ascending arpeggio for achievement unlock
     */
    function playAchievement() {
        if (!_enabled || _muted) return;
        var notes = [523, 587, 659, 784, 880, 1047];
        for (var i = 0; i < notes.length; i++) {
            (function (note, delay) {
                setTimeout(function () {
                    playTone(note, 0.15, 'sine');
                }, delay);
            })(notes[i], i * 70);
        }
        // Final sustained chord
        setTimeout(function () {
            playTone(1047, 0.5, 'sine');
            playTone(784, 0.5, 'sine');
            playTone(659, 0.5, 'sine');
        }, notes.length * 70);
    }

    /**
     * Dramatic sting for chapter start
     */
    function playChapterStart() {
        if (!_enabled || _muted) return;
        var ctx = getContext();
        if (!ctx) return;

        // Low rumble
        var osc1 = ctx.createOscillator();
        var gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 80;
        gain1.gain.value = _sfxVolume * 0.6;
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc1.connect(gain1);
        gain1.connect(_sfxGain);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.0);

        // Rising tension
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(200, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.8);
        gain2.gain.value = _sfxVolume * 0.4;
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc2.connect(gain2);
        gain2.connect(_sfxGain);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 1.0);

        // Impact hit
        setTimeout(function () {
            playTone(440, 0.4, 'triangle');
            playTone(554, 0.4, 'triangle');
            playTone(659, 0.4, 'triangle');
        }, 700);
    }

    /**
     * Soft click + confirmation tone for choice selection
     */
    function playChoice() {
        if (!_enabled || _muted) return;
        playTone(800, 0.05, 'sine');
        setTimeout(function () { playTone(1000, 0.1, 'sine'); }, 60);
        setTimeout(function () { playTone(1200, 0.15, 'sine'); }, 130);
    }

    /**
     * Nature sound: wind chimes for season change
     */
    function playSeasonChange() {
        if (!_enabled || _muted) return;
        var ctx = getContext();
        if (!ctx) return;

        // Random high-pitched chime notes
        var chimeNotes = [1200, 1400, 1600, 1800, 2000, 2200];
        for (var i = 0; i < 6; i++) {
            (function (freq, delay) {
                setTimeout(function () {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq + (Math.random() * 100 - 50);
                    gain.gain.value = _sfxVolume * 0.3;
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                    osc.connect(gain);
                    gain.connect(_sfxGain);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.8);
                }, delay);
            })(chimeNotes[i], i * 150 + Math.random() * 100);
        }
    }

    /**
     * Thunder rumble or rain drop for weather change
     */
    function playWeatherChange(weatherType) {
        if (!_enabled || _muted) return;
        var ctx = getContext();
        if (!ctx) return;

        if (weatherType === 'rainy' || weatherType === 'stormy') {
            // Thunder rumble
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 50 + Math.random() * 30;
            gain.gain.value = _sfxVolume * 0.5;
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(_sfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);

            // Rain drops (filtered noise simulation)
            if (weatherType === 'rainy') {
                for (var i = 0; i < 8; i++) {
                    (function (delay) {
                        setTimeout(function () {
                            playTone(2000 + Math.random() * 3000, 0.05, 'sine');
                        }, delay);
                    })(i * 80 + Math.random() * 60);
                }
            }
        } else if (weatherType === 'snowy') {
            // Soft sparkle
            for (var j = 0; j < 5; j++) {
                (function (delay) {
                    setTimeout(function () {
                        playTone(1500 + Math.random() * 1000, 0.2, 'sine');
                    }, delay);
                })(j * 200 + Math.random() * 150);
            }
        } else {
            // Default gentle whoosh
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(300, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
            osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.6);
            gain2.gain.value = _sfxVolume * 0.3;
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc2.connect(gain2);
            gain2.connect(_sfxGain);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.6);
        }
    }

    /**
     * Heartbeat sound for heart events
     */
    function playHeartEvent() {
        if (!_enabled || _muted) return;
        var ctx = getContext();
        if (!ctx) return;

        // Double heartbeat
        for (var beat = 0; beat < 2; beat++) {
            (function (b) {
                var delay = b * 250;
                setTimeout(function () {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 60;
                    gain.gain.setValueAtTime(_sfxVolume * 0.8, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.connect(gain);
                    gain.connect(_sfxGain);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                }, delay);
            })(beat);
        }
    }

    /**
     * Ascending scale for level up
     */
    function playLevelUp() {
        if (!_enabled || _muted) return;
        var scale = [262, 294, 330, 349, 392, 440, 494, 523];
        for (var i = 0; i < scale.length; i++) {
            (function (note, delay) {
                setTimeout(function () {
                    playTone(note, 0.12, 'square');
                }, delay);
            })(scale[i], i * 60);
        }
        // Final sparkle
        setTimeout(function () {
            playTone(523, 0.3, 'sine');
            playTone(659, 0.3, 'sine');
            playTone(784, 0.3, 'sine');
        }, scale.length * 60);
    }

    /**
     * Gentle ping for notifications
     */
    function playNotification() {
        if (!_enabled || _muted) return;
        playTone(880, 0.15, 'sine');
        setTimeout(function () { playTone(1100, 0.2, 'sine'); }, 100);
    }

    // ── BGM System ──────────────────────────────────────────────

    /**
     * Start playing a BGM track with crossfade
     * @param {string} trackId - Track ID from BGM_TRACKS
     */
    function playBGM(trackId) {
        var track = BGM_TRACKS[trackId];
        if (!track) {
            console.warn('[Audio] Unknown BGM track:', trackId);
            return;
        }

        var ctx = getContext();
        if (!ctx) return;

        // If same track is playing, do nothing
        if (_currentBGMTrack === trackId && _bgmNodes.length > 0) return;

        // Save previous track for returning later
        if (_currentBGMTrack && _currentBGMTrack !== trackId) {
            _previousTrack = _currentBGMTrack;
        }

        // Stop current BGM with fade
        stopBGMNodes();

        _currentBGMTrack = trackId;

        // Fade in new BGM
        _bgmGain.gain.setValueAtTime(0, ctx.currentTime);
        _bgmGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.0);

        // Start the BGM loop
        startBGMLoop(track);
    }

    /**
     * Stop background music with fade out
     */
    function stopBGM() {
        var ctx = getContext();
        if (!ctx) return;

        // Fade out over 1 second
        _bgmGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);

        // Clean up nodes after fade
        clearTimeout(_bgmLoopTimer);
        clearTimeout(_bgmFadeTimer);
        _bgmFadeTimer = setTimeout(function () {
            stopBGMNodes();
            _currentBGMTrack = null;
        }, 1500);
    }

    /**
     * Stop all active BGM oscillator nodes immediately
     */
    function stopBGMNodes() {
        clearTimeout(_bgmLoopTimer);
        for (var i = 0; i < _bgmNodes.length; i++) {
            try {
                _bgmNodes[i].stop();
            } catch (e) {
                // Node may already be stopped
            }
        }
        _bgmNodes = [];
    }

    /**
     * Start the procedural BGM loop for a track
     */
    function startBGMLoop(track) {
        var ctx = getContext();
        if (!ctx) return;

        var beatDuration = 60.0 / track.bpm;
        var barDuration = beatDuration * 4;
        var chordProgression = CHORDS[track.key] || CHORDS['C'];
        var melodyPool = MELODY_NOTES[track.mood] || MELODY_NOTES['peaceful'];

        // Play one full chord progression (4 bars)
        playBGMProgression(track, chordProgression, melodyPool, barDuration, 0);

        // Schedule next loop
        var totalDuration = barDuration * 4;
        _bgmLoopTimer = setTimeout(function () {
            if (_currentBGMTrack === track.id || _currentBGMTrack === getTrackIdByName(track)) {
                startBGMLoop(track);
            }
        }, totalDuration * 1000 - 100); // slight overlap for seamless loop
    }

    /**
     * Get track ID by track name
     */
    function getTrackIdByName(track) {
        for (var id in BGM_TRACKS) {
            if (BGM_TRACKS[id] === track) return id;
        }
        return null;
    }

    /**
     * Play a single chord progression cycle (4 chords, each 1 bar)
     */
    function playBGMProgression(track, chordProgression, melodyPool, barDuration, startTime) {
        var ctx = getContext();
        if (!ctx) return;

        for (var chordIdx = 0; chordIdx < chordProgression.length; chordIdx++) {
            var chord = chordProgression[chordIdx];
            var chordStart = startTime + chordIdx * barDuration;

            // Pad sound (low-pass filtered sawtooth)
            playBGMPad(track.baseFreq, chord, chordStart, barDuration * 0.95);

            // Simple melody (sine wave, 4 notes per bar)
            playBGMMelody(track.baseFreq, melodyPool, chordStart, barDuration, track.mood);
        }
    }

    /**
     * Play a pad chord (filtered sawtooth)
     */
    function playBGMPad(baseFreq, chordIntervals, startTime, duration) {
        var ctx = getContext();
        if (!ctx) return;

        for (var i = 0; i < chordIntervals.length; i++) {
            var semitone = chordIntervals[i];
            var freq = baseFreq * Math.pow(2, semitone / 12);

            // One octave lower for pad
            freq = freq / 2;

            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            // Low-pass filter for warmth
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            filter.Q.value = 1;

            // Soft envelope
            var attackTime = 0.1;
            var releaseTime = 0.3;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.12, startTime + attackTime);
            gain.gain.setValueAtTime(0.12, startTime + duration - releaseTime);
            gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(_bgmGain);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.1);
            _bgmNodes.push(osc);
        }
    }

    /**
     * Play a simple melody over a bar
     */
    function playBGMMelody(baseFreq, notePool, barStart, barDuration, mood) {
        var ctx = getContext();
        if (!ctx) return;

        var notesPerBar = 4;
        var noteDuration = barDuration / notesPerBar;

        for (var i = 0; i < notesPerBar; i++) {
            // Pick a random note from the pool
            var semitone = notePool[Math.floor(Math.random() * notePool.length)];
            var freq = baseFreq * Math.pow(2, semitone / 12);

            // Occasionally rest (20% chance)
            if (Math.random() < 0.2) continue;

            var noteStart = barStart + i * noteDuration;

            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            // Gentle envelope
            var attackTime = 0.05;
            var releaseTime = noteDuration * 0.3;
            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.06, noteStart + attackTime);
            gain.gain.setValueAtTime(0.06, noteStart + noteDuration - releaseTime);
            gain.gain.linearRampToValueAtTime(0.001, noteStart + noteDuration);

            osc.connect(gain);
            gain.connect(_bgmGain);

            osc.start(noteStart);
            osc.stop(noteStart + noteDuration + 0.05);
            _bgmNodes.push(osc);
        }
    }

    // ── Volume Controls ─────────────────────────────────────────

    function setBGMVolume(v) {
        _bgmVolume = Math.max(0, Math.min(1, v));
        if (_bgmMasterGain) {
            _bgmMasterGain.gain.setTargetAtTime(_muted ? 0 : _bgmVolume, _ctx.currentTime, 0.1);
        }
        saveAudioSettings();
    }

    function setSFXVolume(v) {
        _sfxVolume = Math.max(0, Math.min(1, v));
        if (_sfxGain) {
            _sfxGain.gain.setTargetAtTime(_muted ? 0 : _sfxVolume, _ctx.currentTime, 0.1);
        }
        saveAudioSettings();
    }

    function getBGMVolume() { return _bgmVolume; }
    function getSFXVolume() { return _sfxVolume; }

    // ── Mute Controls ───────────────────────────────────────────

    function toggleMute() {
        _muted = !_muted;
        applyMuteState();
        saveAudioSettings();
        updateAudioButtonUI();
        return _muted;
    }

    function isMuted() { return _muted; }

    function applyMuteState() {
        if (!_ctx) return;
        if (_muted) {
            _masterGain.gain.setTargetAtTime(0, _ctx.currentTime, 0.1);
        } else {
            _masterGain.gain.setTargetAtTime(1.0, _ctx.currentTime, 0.1);
        }
    }

    // ── Legacy Controls (backward compatible) ───────────────────

    function setEnabled(enabled) { _enabled = enabled; }
    function setVolume(v) { setSFXVolume(v); }
    function isEnabled() { return _enabled; }

    // ── Track Management ────────────────────────────────────────

    function getCurrentTrack() { return _currentBGMTrack; }

    function getPreviousTrack() { return _previousTrack; }

    function playPreviousBGM() {
        if (_previousTrack) {
            playBGM(_previousTrack);
        } else {
            playBGM('main');
        }
    }

    // ── Audio Settings Persistence ──────────────────────────────

    function saveAudioSettings() {
        try {
            localStorage.setItem('game_audio_settings', JSON.stringify({
                bgmVolume: _bgmVolume,
                sfxVolume: _sfxVolume,
                muted: _muted,
                enabled: _enabled
            }));
        } catch (e) {
            // Ignore storage errors
        }
    }

    function loadAudioSettings() {
        try {
            var saved = localStorage.getItem('game_audio_settings');
            if (saved) {
                var settings = JSON.parse(saved);
                if (typeof settings.bgmVolume === 'number') _bgmVolume = settings.bgmVolume;
                if (typeof settings.sfxVolume === 'number') _sfxVolume = settings.sfxVolume;
                if (typeof settings.muted === 'boolean') _muted = settings.muted;
                if (typeof settings.enabled === 'boolean') _enabled = settings.enabled;
            }
        } catch (e) {
            // Ignore storage errors
        }
    }

    // ── Audio Button UI Update ──────────────────────────────────

    function updateAudioButtonUI() {
        var btn = document.getElementById('audio-toggle-btn');
        if (!btn) return;

        if (_muted) {
            btn.textContent = '\uD83D\uDD07';
            btn.classList.add('audio-muted');
        } else {
            btn.textContent = '\uD83D\uDD0A';
            btn.classList.remove('audio-muted');
        }
    }

    // ── Export ──────────────────────────────────────────────────
    window.GameAudio = {
        // Init
        init: init,

        // Core SFX
        playTone: playTone,

        // Original SFX
        playPlant: playPlant,
        playHarvest: playHarvest,
        playWater: playWater,
        playBuy: playBuy,
        playSell: playSell,
        playError: playError,
        playClick: playClick,

        // Extended SFX (v0.9)
        playGift: playGift,
        playAchievement: playAchievement,
        playChapterStart: playChapterStart,
        playChoice: playChoice,
        playSeasonChange: playSeasonChange,
        playWeatherChange: playWeatherChange,
        playHeartEvent: playHeartEvent,
        playLevelUp: playLevelUp,
        playNotification: playNotification,

        // BGM
        BGM_TRACKS: BGM_TRACKS,
        playBGM: playBGM,
        stopBGM: stopBGM,
        getCurrentTrack: getCurrentTrack,
        getPreviousTrack: getPreviousTrack,
        playPreviousBGM: playPreviousBGM,

        // Volume
        setBGMVolume: setBGMVolume,
        setSFXVolume: setSFXVolume,
        getBGMVolume: getBGMVolume,
        getSFXVolume: getSFXVolume,

        // Mute
        toggleMute: toggleMute,
        isMuted: isMuted,

        // Legacy
        setEnabled: setEnabled,
        setVolume: setVolume,
        isEnabled: isEnabled,

        // UI
        updateAudioButtonUI: updateAudioButtonUI
    };

    // Load saved settings immediately
    loadAudioSettings();
})();
