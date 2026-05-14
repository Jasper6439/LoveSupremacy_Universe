/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ═══════════════════════════════════════════════════════════════
      // 莫兰迪色系 - Morandi Color Palette
      // 主色调：低饱和度、柔和、文艺感
      // ═══════════════════════════════════════════════════════════════
      colors: {
        // 品牌紫色系（莫兰迪紫 - 用户的主色调需求）
        brand: {
          50: '#F3E8FF',   // 极浅紫
          100: '#E9D5FF',  // 浅紫
          200: '#D8B4FE',  // 粉紫
          300: '#C084FC',  // 中紫
          400: '#A855F7',  // 亮紫
          500: '#8A2BE2',  // 主品牌色（蓝紫色）
          600: '#7C3AED',  // 深紫
          700: '#6D28D9',  // 更深紫
          800: '#5B21B6',  // 暗紫
          900: '#4C1D95',  // 极深紫
        },

        // 莫兰迪中性色系（白/灰/黑）
        morandi: {
          // 背景色
          white: '#FAFAFA',      // 莫兰迪白
          gray50: '#F5F5F5',     // 浅灰白
          gray100: '#EEEEEE',    // 浅灰
          gray200: '#E0E0E0',    // 中浅灰
          gray300: '#CCCCCC',    // 中灰
          gray400: '#B0B0B0',    // 中深灰
          gray500: '#888888',    // 深灰
          gray600: '#666666',    // 更深灰
          gray700: '#444444',    // 暗灰
          gray800: '#2A2A2A',    // 极暗灰
          gray900: '#1A1A1A',    // 炭灰
          black: '#0D0D0D',      // 近黑

          // 莫兰迪粉系
          pink: '#E8C4C4',       // 脏粉色（莫兰迪粉）
          pinkLight: '#F5DDD8',   // 浅脏粉
          pinkDark: '#D4A5A5',   // 深脏粉

          // 莫兰迪蓝系
          blue: '#A8C5D9',       // 雾霾蓝
          blueLight: '#C4DCE8',   // 浅雾蓝
          blueDark: '#8FB5C9',    // 深雾蓝

          // 莫兰迪绿系（用于农田）
          grass: '#95D5B2',      // 草地绿（清新柔和）
          grassLight: '#B7E4C7',  // 浅草地绿
          grassDark: '#74C69D',   // 深草地绿
          sage: '#9DC183',        // 鼠尾草绿

          // 莫兰迪天空
          sky: '#B8E0D2',        // 天空绿（柔和青绿）
          skyLight: '#D4EFE3',    // 浅天空绿
          skyDark: '#9DCFB8',    // 深天空绿

          // 莫兰迪泥土色系
          soil: '#DDB892',       // 泥土棕（带点灰调的土黄）
          soilLight: '#E8D4B8',   // 浅泥土
          soilDark: '#C9A67A',   // 深泥土
          earth: '#C4A77D',      // 大地色

          // 莫兰迪作物色系
          tomato: '#E07A5F',      // 番茄红（偏橘调的红，不刺眼）
          tomatoLight: '#F0A090', // 浅番茄
          tomatoDark: '#C85A3E',  // 深番茄
          carrot: '#F4A261',      // 胡萝卜橙
          carrotLight: '#F7C49A', // 浅胡萝卜
          carrotDark: '#D88A3A',  // 深胡萝卜
          corn: '#E9C46A',        // 玉米黄
          cornLight: '#F4DFA0',   // 浅玉米
          cornDark: '#D4A845',    // 深玉米
          wheat: '#F0E6D3',       // 小麦色
          leaf: '#74C69D',        // 叶子绿

          // 莫兰迪其他
          lavender: '#C8B8DB',   // 薰衣草紫
          peach: '#F5D5C8',      // 蜜桃色
          mint: '#B8D4CE',       // 薄荷绿
          cream: '#F5F0E8',      // 奶油色

          // ═══════════════════════════════════════════════════════════════
          // 美拉德色系 - Maillard Color Palette
          // 用于：食物、烹饪、亲密度互动
          // 特点：温暖的焦糖色、暖棕色
          // ═══════════════════════════════════════════════════════════════
          maillard: {
            caramel: '#C68E17',   // 焦糖色（核心点缀色）
            caramelLight: '#E0A82E', // 浅焦糖
            caramelDark: '#A67312', // 深焦糖

            honey: '#FFB347',     // 蜂蜜色
            honeyLight: '#FFD180', // 浅蜂蜜
            honeyDark: '#E09520', // 深蜂蜜

            amber: '#D4A574',     // 琥珀色
            amberLight: '#E8C5A0', // 浅琥珀
            amberDark: '#B8895A', // 深琥珀

            warmBrown: '#8B6914', // 暖棕色
            warmBrownLight: '#A68532', // 浅暖棕
            warmBrownDark: '#6B5010', // 深暖棕

            toast: '#A0785A',     // 烤面包色
            toastLight: '#C4A080', // 浅烤色
            toastDark: '#7A5A3C', // 深烤色

            // 亲密度/爱心色系
            love: '#E07A5F',      // 爱心红（与番茄红协调）
            loveLight: '#F0A090', // 浅爱心
            loveDark: '#C85A3E', // 深爱心
            heart: '#FF6B6B',    // 心动红
            blush: '#FFB6C1',     // 腮红粉

            // 食物相关的温暖色
            cheese: '#FFD93D',    // 奶酪黄
            butter: '#FFF3B0',    // 黄油色
            chocolate: '#5C4033', // 巧克力色
          },
        },

        // iOS系统色
        ios: {
          bg: {
            primary: '#F5F5F7',
            secondary: '#FFFFFF',
            tertiary: '#E8E8ED',
          },
          text: {
            primary: '#1D1D1F',
            secondary: '#86868B',
            tertiary: '#AEAEB2',
          },
          separator: 'rgba(0, 0, 0, 0.08)',
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // 圆角系统 - iOS风格
      // ═══════════════════════════════════════════════════════════════
      borderRadius: {
        'ios-sm': '8px',      // 按钮
        'ios-md': '12px',     // 卡片
        'ios-lg': '16px',     // 模态框
        'ios-xl': '24px',     // 大容器
        'ios-2xl': '32px',    // 超大容器
      },

      // ═══════════════════════════════════════════════════════════════
      // 阴影系统
      // ═══════════════════════════════════════════════════════════════
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.1)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'fab': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'fab-hover': '0 12px 32px rgba(0, 0, 0, 0.15)',
        'modal': '0 16px 48px rgba(0, 0, 0, 0.15)',
        'modal-heavy': '0 24px 64px rgba(0, 0, 0, 0.2)',
      },

      // ═══════════════════════════════════════════════════════════════
      // 字体配置
      // ═══════════════════════════════════════════════════════════════
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'SFMono-Regular',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'monospace',
        ],
      },

      // ═══════════════════════════════════════════════════════════════
      // 动效配置
      // ═══════════════════════════════════════════════════════════════
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },

      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      // ═══════════════════════════════════════════════════════════════
      // 其他配置
      // ═══════════════════════════════════════════════════════════════
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },

      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
