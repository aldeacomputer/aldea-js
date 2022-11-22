import styles from './aldeaButton.module.scss'

export function AldeaButton({onClick, label, variant, disabled, disableText}) {

  const mapVariantToClassName = () => {
    const map = {
      primary: styles.primaryButton,
      secondary: styles.secondaryButton,
      tertiary: styles.tertiaryButton,
      background: styles.backgroundButton,
      accent: styles.accentButton,
      borderlessDark: styles.borderlessDarkButton,
      borderlessLight: styles.borderlessLightButton
    }
    return map[variant] || styles.container
  }

    return (
        <button title={disabled ? disableText: ''}
            className={`${mapVariantToClassName()} ${disabled && styles.disabled}`}
            onClick={() => !disabled && onClick()}>{label}</button>
    )
}
