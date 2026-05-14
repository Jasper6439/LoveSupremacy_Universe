/**
 * NxSiran Game - Story Content Data
 * v0.5 Story Engine - Chapter definitions for Love Supremacy Zone
 * All story content separated from engine logic for maintainability.
 */
(function () {
    'use strict';

    var chapters = [
        // ═══════════════════════════════════════════════════════════
        // Chapter 1: 初遇 (First Encounter)
        // ═══════════════════════════════════════════════════════════
        {
            id: 'ch1',
            title: '第一章：初遇',
            subtitle: 'First Encounter',
            requiredHearts: 0,
            requiredAwakening: 0,
            locations: ['track', 'school_gate'],
            scenes: [
                {
                    id: 'ch1_s1',
                    type: 'narration',
                    text: '四月的新叶男子高中，樱花瓣随风飘落。\n\n转学生——也就是你，站在校门口，手里攥着皱巴巴的入学通知书。空气中弥漫着春天特有的青草气息，远处传来隐约的脚步声。',
                    background: null,
                    next: 'ch1_s2'
                },
                {
                    id: 'ch1_s2',
                    type: 'narration',
                    text: '「新叶男子高中」——一所坐落在首尔郊外的私立男校。\n\n据说这里的学生大多是各校的田径尖子。你因为父母工作调动，从釜山转学而来，对一切都感到陌生。',
                    background: null,
                    next: 'ch1_s3'
                },
                {
                    id: 'ch1_s3',
                    type: 'dialogue',
                    speaker: 'system',
                    text: '教务处的老师告诉你，你的班级在二年级三班。穿过操场，就能到达教学楼。\n\n你深吸一口气，迈出了第一步。',
                    background: null,
                    next: 'ch1_cg1'
                },
                {
                    id: 'ch1_cg1',
                    type: 'cg',
                    prompt: 'Korean BL drama cinematic scene, young athletic Korean man 18yo standing on running track at sunset, golden hour lighting, wind blowing through hair, solitary figure, melancholic atmosphere, film grain, shallow depth of field, anamorphic lens flare, school track field background',
                    caption: '田径场上的背影',
                    next: 'ch1_s5'
                },
                {
                    id: 'ch1_s5',
                    type: 'narration',
                    text: '穿过操场的时候，你看到了他。\n\n一个少年独自站在跑道上，夕阳把他的影子拉得很长。他没有在跑步，只是站在那里，看着远处的天际线。校服袖子挽到手肘，露出晒成小麦色的手臂。',
                    background: null,
                    next: 'ch1_s6'
                },
                {
                    id: 'ch1_s6',
                    type: 'narration',
                    text: '他的侧脸在逆光中显得格外清晰——微微蹙起的眉头，抿紧的嘴唇，还有那种……仿佛与整个世界隔绝的孤独感。\n\n你的脚步不自觉地慢了下来。',
                    background: null,
                    next: 'ch1_choice1'
                },
                {
                    id: 'ch1_choice1',
                    type: 'choice',
                    text: '你要怎么做？',
                    choices: [
                        {
                            text: '主动打招呼',
                            next: 'ch1_s7a',
                            effects: { affection: 2, happiness: 1 }
                        },
                        {
                            text: '默默观察一会儿',
                            next: 'ch1_s7b',
                            effects: { affection: 1 }
                        },
                        {
                            text: '追上去搭话',
                            next: 'ch1_s7c',
                            effects: { affection: 3, happiness: 2 }
                        }
                    ]
                },
                {
                    id: 'ch1_s7a',
                    type: 'dialogue',
                    speaker: 'player',
                    text: '（走近几步）那个……你好，我是今天转来的新生。',
                    expression: null,
                    next: 'ch1_s8a'
                },
                {
                    id: 'ch1_s7b',
                    type: 'narration',
                    text: '你站在原地，远远地看着他。\n\n风吹过跑道，卷起几片落叶。他始终一动不动，像是被时间遗忘的雕像。\n\n过了很久，你才轻手轻脚地绕过操场，向教学楼走去。',
                    next: 'ch1_s8b'
                },
                {
                    id: 'ch1_s7c',
                    type: 'dialogue',
                    speaker: 'player',
                    text: '（小跑着过去）喂！同学！你也是这个学校的吗？',
                    expression: null,
                    next: 'ch1_s8c'
                },
                {
                    id: 'ch1_s8a',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（转过头，眼神冷淡）……学长？',
                    expression: 'surprised',
                    next: 'ch1_s9'
                },
                {
                    id: 'ch1_s8b',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（余光瞥见了你，但什么也没说）',
                    expression: 'default',
                    next: 'ch1_s9b'
                },
                {
                    id: 'ch1_s8c',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（被突然靠近吓了一跳，后退半步）……你谁？',
                    expression: 'surprised',
                    next: 'ch1_s9c'
                },
                {
                    id: 'ch1_s9',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……转学生？（看了你一眼，又转回去看天际线）……欢迎。',
                    expression: 'default',
                    next: 'ch1_s10'
                },
                {
                    id: 'ch1_s9b',
                    type: 'narration',
                    text: '虽然没有说上话，但那个背影却深深地刻在了你的脑海里。\n\n后来你才知道，他叫车如云——田径部的王牌，也是全校最孤僻的人。',
                    next: 'ch1_s10'
                },
                {
                    id: 'ch1_s9c',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（皱眉）……别靠那么近。（顿了顿）……转学生？',
                    expression: 'angry',
                    next: 'ch1_s9c2'
                },
                {
                    id: 'ch1_s9c2',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……嗯。车如云。记住了就行，别来烦我。',
                    expression: 'default',
                    next: 'ch1_s10'
                },
                {
                    id: 'ch1_s10',
                    type: 'narration',
                    text: '车如云。\n\n这个名字，从今天开始，将会频繁地出现在你的生活中。\n\n你不知道的是，这个看似冷漠的少年，背负着你不曾了解的过去。而你的出现，将会慢慢改变这一切……',
                    background: null,
                    next: 'ch1_end'
                },
                {
                    id: 'ch1_end',
                    type: 'event',
                    text: '第一章「初遇」完成！\n\n你与车如云的命运齿轮，开始转动。\n\n好感度达到 3 即可解锁下一章。',
                    unlockChapter: 'ch2',
                    next: null
                }
            ]
        },

        // ═══════════════════════════════════════════════════════════
        // Chapter 2: 天台 (The Rooftop)
        // ═══════════════════════════════════════════════════════════
        {
            id: 'ch2',
            title: '第二章：天台',
            subtitle: 'The Rooftop',
            requiredHearts: 3,
            requiredAwakening: 0,
            locations: ['rooftop'],
            scenes: [
                {
                    id: 'ch2_s1',
                    type: 'narration',
                    text: '入学一周后的某个傍晚。\n\n你发现了一个秘密——教学楼的天台门没有锁。\n\n推开那扇生锈的铁门，傍晚的风迎面扑来，带着远处城市的喧嚣和近处校园的宁静。',
                    background: null,
                    next: 'ch2_cg1'
                },
                {
                    id: 'ch2_cg1',
                    type: 'cg',
                    prompt: 'Korean BL drama cinematic scene, night cityscape viewed from school rooftop, young Korean man 18yo sitting alone on rooftop ledge, city lights twinkling below, starry sky above, cool blue and purple tones, melancholic atmosphere, film grain, shallow depth of field, anime-inspired cinematography',
                    caption: '天台上的星空',
                    next: 'ch2_s3'
                },
                {
                    id: 'ch2_s3',
                    type: 'narration',
                    text: '然而，天台上并不只有你一个人。\n\n那个熟悉的身影正坐在天台边缘，双腿悬空，背对着你。晚风吹起他校服的下摆，在暮色中轻轻飘动。',
                    background: null,
                    next: 'ch2_s4'
                },
                {
                    id: 'ch2_s4',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（头也没回）……又是你。',
                    expression: 'default',
                    next: 'ch2_choice1'
                },
                {
                    id: 'ch2_choice1',
                    type: 'choice',
                    text: '你要怎么做？',
                    choices: [
                        {
                            text: '在他旁边坐下',
                            next: 'ch2_s5a',
                            effects: { affection: 3, happiness: 2 }
                        },
                        {
                            text: '站在几步远的地方',
                            next: 'ch2_s5b',
                            effects: { affection: 1 }
                        },
                        {
                            text: '默默离开，不打扰他',
                            next: 'ch2_s5c',
                            effects: { affection: 0, happiness: -1 }
                        }
                    ]
                },
                {
                    id: 'ch2_s5a',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（身体微微一僵，但没有躲开）……随便你。',
                    expression: 'shy',
                    next: 'ch2_s6a'
                },
                {
                    id: 'ch2_s5b',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（余光扫了你一眼）……站那么远干什么。怕我吃了你？',
                    expression: 'default',
                    next: 'ch2_s6b'
                },
                {
                    id: 'ch2_s5c',
                    type: 'narration',
                    text: '你悄悄退了回去。\n\n铁门在身后合上时，你隐约听到了一声极轻的叹息。\n\n……也许，他其实并不想一个人。',
                    next: 'ch2_s6c'
                },
                {
                    id: 'ch2_s6a',
                    type: 'narration',
                    text: '你坐在他身边，两个人之间隔着一个拳头的距离。\n\n天边的最后一抹橘红色正在消退，城市的灯火一盏一盏亮了起来。远处传来电车的声音，悠长而孤独。',
                    next: 'ch2_s7'
                },
                {
                    id: 'ch2_s6b',
                    type: 'narration',
                    text: '你靠在天台的围栏上，和他保持着微妙的距离。\n\n夜色渐浓，天边的星星一颗接一颗地出现。他始终没有回头，但也没有让你离开。',
                    next: 'ch2_s7'
                },
                {
                    id: 'ch2_s6c',
                    type: 'dialogue',
                    speaker: 'system',
                    text: '第二天，你在走廊上遇到了车如云。\n他看了你一眼，什么也没说就走了。\n但你觉得，他的眼神似乎和平时不太一样。',
                    next: 'ch2_s7'
                },
                {
                    id: 'ch2_s7',
                    type: 'dialogue',
                    speaker: 'player',
                    text: '……（抬头看天）今晚的星星好多。',
                    expression: null,
                    next: 'ch2_s8'
                },
                {
                    id: 'ch2_s8',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……嗯。（沉默了很久）……奶奶以前说，星星多的时候，就代表有人在想念谁。',
                    expression: 'thinking',
                    next: 'ch2_s9'
                },
                {
                    id: 'ch2_s9',
                    type: 'dialogue',
                    speaker: 'player',
                    text: '……你奶奶？',
                    expression: null,
                    next: 'ch2_s10'
                },
                {
                    id: 'ch2_s10',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（声音变得很轻）……她住在乡下。身体不太好。\n……我每个月都会回去看她。\n……（停顿）……算了，跟你没关系。',
                    expression: 'sad',
                    next: 'ch2_s11'
                },
                {
                    id: 'ch2_s11',
                    type: 'narration',
                    text: '这是车如云第一次在你面前提起家人。\n\n虽然他很快又竖起了那堵无形的墙，但那一瞬间的脆弱，却让你看到了冰冷外表下隐藏的温度。',
                    background: null,
                    next: 'ch2_s12'
                },
                {
                    id: 'ch2_s12',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（站起来，拍了拍裤子上的灰）……天晚了，回去吧。\n……（走了几步，突然停下）……学长。\n……这里，一般没人来。你想来的话……随便。',
                    expression: 'shy',
                    next: 'ch2_end'
                },
                {
                    id: 'ch2_end',
                    type: 'event',
                    text: '第二章「天台」完成！\n\n车如云对你敞开了一点点心扉。\n他的孤独，也许不只是性格使然。\n\n好感度达到 5 即可解锁下一章。',
                    unlockChapter: 'ch3',
                    next: null
                }
            ]
        },

        // ═══════════════════════════════════════════════════════════
        // Chapter 3: 雨伞 (The Umbrella)
        // ═══════════════════════════════════════════════════════════
        {
            id: 'ch3',
            title: '第三章：雨伞',
            subtitle: 'The Umbrella',
            requiredHearts: 5,
            requiredAwakening: 0,
            locations: ['school_entrance'],
            scenes: [
                {
                    id: 'ch3_s1',
                    type: 'narration',
                    text: '梅雨季节来得毫无预兆。\n\n最后一节课结束的时候，窗外已经是大雨倾盆。雨水打在玻璃上，发出密集而急促的声响，整个世界都被灰蒙蒙的水雾笼罩。',
                    background: null,
                    next: 'ch3_cg1'
                },
                {
                    id: 'ch3_cg1',
                    type: 'cg',
                    prompt: 'Korean BL drama cinematic scene, heavy rain at school entrance gate, young Korean man 18yo standing under awning without umbrella, rain droplets visible, moody blue-grey atmosphere, wet school uniform, cinematic lighting, water reflections on ground, film grain, emotional atmosphere, shallow depth of field',
                    caption: '雨中的校门口',
                    next: 'ch3_s3'
                },
                {
                    id: 'ch3_s3',
                    type: 'narration',
                    text: '你撑着伞走到校门口，看到了一个熟悉的身影。\n\n车如云站在校门外的屋檐下，双手插在口袋里，面无表情地看着大雨。他的校服已经被斜飘的雨丝打湿了一半，但他似乎毫不在意。',
                    background: null,
                    next: 'ch3_s4'
                },
                {
                    id: 'ch3_s4',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（看到你，微微点头）……学长。',
                    expression: 'default',
                    next: 'ch3_choice1'
                },
                {
                    id: 'ch3_choice1',
                    type: 'choice',
                    text: '雨这么大，你要怎么做？',
                    choices: [
                        {
                            text: '把伞递给他',
                            next: 'ch3_s5a',
                            effects: { affection: 2, happiness: 1 }
                        },
                        {
                            text: '邀请他共撑一把伞',
                            next: 'ch3_s5b',
                            effects: { affection: 4, happiness: 3 }
                        },
                        {
                            text: '拉着他一起冲进雨里',
                            next: 'ch3_s5c',
                            effects: { affection: 3, happiness: 2 }
                        }
                    ]
                },
                {
                    id: 'ch3_s5a',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（看着你递过来的伞，沉默了几秒）……你呢？\n……（你还没回答，他已经把伞推了回来）……不用。我不怕淋雨。',
                    expression: 'surprised',
                    next: 'ch3_s6a'
                },
                {
                    id: 'ch3_s5b',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（愣了一下，耳朵微微泛红）……一起？\n……（移开视线）……随便。反正顺路。',
                    expression: 'shy',
                    next: 'ch3_s6b'
                },
                {
                    id: 'ch3_s5c',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……（被你突然拉住手腕，整个人僵住了）……喂！你干什——\n……（雨水瞬间浇透了两人的校服）……疯了吗你！',
                    expression: 'surprised',
                    next: 'ch3_s6c'
                },
                {
                    id: 'ch3_s6a',
                    type: 'narration',
                    text: '他没有接你的伞，但你注意到他把校服拉链拉到了最高。\n\n两个人在雨中并肩走着，你撑着伞，他淋着雨。\n\n他始终走在你伞的边缘——刚好不会被淋到太多，但也不算真正在伞下。',
                    next: 'ch3_s7'
                },
                {
                    id: 'ch3_s6b',
                    type: 'narration',
                    text: '一把伞，两个人。\n\n伞不大，你不得不把伞倾向他那边，自己的肩膀露在外面。他似乎注意到了，但没有说什么——只是默默地往你这边靠了一点点。\n\n雨声很大，大到可以掩盖一切不该被听到的声音。比如心跳。',
                    next: 'ch3_s7'
                },
                {
                    id: 'ch3_s6c',
                    type: 'narration',
                    text: '你们在暴雨中狂奔，笑声和雨声混在一起。\n\n跑到公交站的时候，两个人都已经浑身湿透。他的头发贴在额头上，水珠顺着下巴滴落。\n\n然后——他笑了。\n\n那是你第一次看到车如云笑。虽然只有一瞬间，但那个画面，比任何CG都要珍贵。',
                    next: 'ch3_s7'
                },
                {
                    id: 'ch3_s7',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……学长。\n……（声音被雨声盖住了一半）……你这个人……真的很奇怪。',
                    expression: 'thinking',
                    next: 'ch3_s8'
                },
                {
                    id: 'ch3_s8',
                    type: 'dialogue',
                    speaker: 'player',
                    text: '……奇怪？',
                    expression: null,
                    next: 'ch3_s9'
                },
                {
                    id: 'ch3_s9',
                    type: 'dialogue',
                    speaker: 'chayewoon',
                    text: '……嗯。（低下头，看着地上的水洼）\n……别人都离我远远的。只有你……\n……（声音越来越小）……总是凑过来。',
                    expression: 'shy',
                    next: 'ch3_s10'
                },
                {
                    id: 'ch3_s10',
                    type: 'event',
                    text: '心级事件解锁 ——「雨天共伞」\n\n雨停了。\n\n车如云在公交站和你道别。他走出几步后，突然回过头来——\n\n「……学长。明天见。」\n\n那是他第一次主动跟你说再见。',
                    unlockChapter: null,
                    unlockEvent: 'rain_umbrella',
                    next: null
                }
            ]
        }
    ];

    // ── Helper Functions ──────────────────────────────────────────

    function getChapter(id) {
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].id === id) return chapters[i];
        }
        return null;
    }

    function getScene(chapterId, sceneId) {
        var chapter = getChapter(chapterId);
        if (!chapter) return null;
        for (var i = 0; i < chapter.scenes.length; i++) {
            if (chapter.scenes[i].id === sceneId) return chapter.scenes[i];
        }
        return null;
    }

    // ── Export ────────────────────────────────────────────────────
    window.StoryData = {
        chapters: chapters,
        getChapter: getChapter,
        getScene: getScene
    };
})();
