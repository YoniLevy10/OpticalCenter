import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = 'he'
        document.documentElement.dir = 'rtl'
        document.body.dir = 'rtl'
      }
      return (
        <div dir="rtl" lang="he" className="min-h-[40vh] bg-canvas text-ink">
          <Story />
        </div>
      )
    },
  ],
}

export default preview
