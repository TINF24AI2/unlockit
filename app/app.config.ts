export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brandgreen',
      success: 'brandgreen',
      secondary: 'brand',
      warning: 'brandyellow',
      error: 'brandred',
      neutral: 'brandgrey'
    },
    button: {
      compoundVariants: [
        { color: 'secondary', variant: 'solid', class: 'text-black' }
      ]
    },
    badge: {
      compoundVariants: [
        { color: 'primary', variant: 'subtle', class: 'bg-brandgreen-50' },
        { color: 'success', variant: 'subtle', class: 'bg-brandgreen-50' },
        { color: 'neutral', variant: 'subtle', class: 'bg-brandgrey-50' }
      ]
    },
    navigationMenu: {
      compoundVariants: [
        { active: true, variant: 'pill', class: { link: 'before:bg-brand-400' } }
      ]
    },
    input: {
      variants: {
        variant: {
          outline: 'text-black bg-white ring ring-inset ring-brandgrey-50'
        }
      }
    },
    textarea: {
      variants: {
        variant: {
          outline: 'text-black bg-white ring ring-inset ring-brandgrey-50'
        }
      }
    },
    select: {
      variants: {
        variant: {
          outline: 'text-black bg-white ring ring-inset ring-brandgrey-50 hover:bg-brandgrey-50'
        }
      }
    },
    checkbox: {
      slots: {
        base: 'rounded-sm ring ring-inset ring-brandgrey-50'
      }
    }
  }
})
