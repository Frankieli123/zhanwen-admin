import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath } from 'url'
import VueMacros from 'unplugin-vue-macros/vite'

// 兼容 ESM：定义 __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const VITE_VERSION = env.VITE_VERSION || 'dev'
  const VITE_BASE_URL = env.VITE_BASE_URL || '/'
  const VITE_PORT = Number(env.VITE_PORT || 5173)
  const VITE_API_PROXY_URL = env.VITE_API_PROXY_URL || 'http://localhost:3001'

  console.log(`VITE_API_URL = ${env.VITE_API_URL}`)
  console.log(`VERSION = ${VITE_VERSION}`)

  return defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(VITE_VERSION)
    },
    base: VITE_BASE_URL,
    server: {
      port: VITE_PORT,
      host: true,
      proxy: {
        '/api': {
          target: VITE_API_PROXY_URL,
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': resolvePath('src/views'),
        '@assets': resolvePath('src/assets'),
        '@styles': resolvePath('src/assets/styles'),
        '@imgs': resolvePath('src/assets/img'),
        '@icons': resolvePath('src/assets/icons'),
        '@utils': resolvePath('src/utils'),
        '@store': resolvePath('src/store'),
        '@router': resolvePath('src/router'),
        '@components': resolvePath('src/components'),
        '@config': resolvePath('src/config'),
        '@enums': resolvePath('src/enums'),
        '@types': resolvePath('src/types')
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia', 'element-plus']
          }
        }
      }
    },
    plugins: [
      VueMacros({
        defineOptions: true,
        plugins: {
          vue: vue()
        }
      }),
      Components({
        deep: true,
        extensions: ['vue'],
        dirs: ['src/components'],
        resolvers: [ElementPlusResolver({ importStyle: 'css' })],
        dts: 'src/types/components.d.ts'
      }),
      AutoImport({
        imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        resolvers: [ElementPlusResolver()],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: {
          enabled: false,
          filepath: './.auto-import.json',
          globalsPropValue: true
        }
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@styles/variables.scss" as *; @use "@styles/mixin.scss" as *;`
        }
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule: any) => {
                if (atRule.name === 'charset') atRule.remove()
              }
            }
          }
        ]
      }
    },
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'axios',
        '@vueuse/core',
        'echarts',
        '@wangeditor/editor',
        '@wangeditor/editor-for-vue',
        'vue-i18n',
        'xlsx',
        'file-saver',
        'vue-img-cutter',
        'xgplayer'
      ]
    }
  })
}

function resolvePath(paths: string) {
  return path.resolve(__dirname, paths)
}
