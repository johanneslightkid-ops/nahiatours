import React from 'react';
import { TbCornerDownLeft, TbPlayerPauseFilled, TbPlayerPlayFilled } from 'react-icons/tb';
import { usePlannerBar } from '../../planner/plannerBar';
import { useI18n, type Locale } from '../../contexts/I18nContext';

const COPY: Record<'pause' | 'play' | 'next' | 'skip' | 'pick', Record<Locale, string>> = {
  pause: { en: 'Pause the voice guide', es: 'Pausar la guía de voz', fr: 'Mettre la voix en pause', de: 'Sprachführer pausieren' },
  play: { en: 'Play the voice guide', es: 'Reproducir la guía de voz', fr: 'Lancer la voix', de: 'Sprachführer abspielen' },
  next: { en: 'Continue (Enter)', es: 'Continuar (Enter)', fr: 'Continuer (Entrée)', de: 'Weiter (Enter)' },
  skip: { en: 'Skip (Enter)', es: 'Saltar (Enter)', fr: 'Passer (Entrée)', de: 'Überspringen (Enter)' },
  pick: { en: 'Choose an answer first', es: 'Elige una respuesta primero', fr: 'Choisissez d’abord une réponse', de: 'Zuerst eine Antwort wählen' },
};

/**
 * Two big round buttons in the top bar, on the planner page only and always
 * in view: the voice guide's play/pause, and "continue" — the Enter key as a
 * button, labelled with the key so it is clear Enter does the same.
 */
const PlannerBarControls: React.FC<{ tone: 'light' | 'dark' }> = ({ tone }) => {
  const bar = usePlannerBar();
  const { locale } = useI18n();
  if (!bar.audioAvailable && !bar.next) return null;
  const nextLabel = bar.canContinue ? (bar.skip ? COPY.skip[locale] : COPY.next[locale]) : COPY.pick[locale];

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Planner">
      {bar.audioAvailable && (
        <button
          type="button"
          onClick={() => bar.toggleAudio?.()}
          className="planner-bar-btn"
          data-tone={tone}
          data-on={bar.audioOn}
          aria-pressed={bar.audioOn}
          aria-label={bar.audioOn ? COPY.pause[locale] : COPY.play[locale]}
          title={bar.audioOn ? COPY.pause[locale] : COPY.play[locale]}
        >
          {bar.audioOn ? <TbPlayerPauseFilled className="h-6 w-6" /> : <TbPlayerPlayFilled className="h-6 w-6 translate-x-[1px]" />}
          {bar.audioOn && <span className="planner-bar-pulse" aria-hidden="true" />}
        </button>
      )}
      {bar.next && (
        <button
          type="button"
          onClick={() => bar.next?.()}
          disabled={!bar.canContinue}
          className="planner-bar-btn planner-bar-next"
          data-tone={tone}
          aria-label={nextLabel}
          title={nextLabel}
        >
          <TbCornerDownLeft className="h-6 w-6" strokeWidth={2.2} />
          <span className="planner-bar-key" aria-hidden="true">Enter</span>
        </button>
      )}
    </div>
  );
};

export default PlannerBarControls;
