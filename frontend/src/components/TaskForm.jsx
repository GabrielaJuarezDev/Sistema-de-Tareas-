import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function TaskForm({ onCreate, disabled }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState('');
  const [reminderOffsetMin, setReminderOffsetMin] = useState('10');
  const [localError, setLocalError] = useState('');
  const [listeningField, setListeningField] = useState('');
  const [micStatus, setMicStatus] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micDebug, setMicDebug] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [micDevices, setMicDevices] = useState([]);
  const [micDeviceId, setMicDeviceId] = useState(() => {
    try {
      return localStorage.getItem('mic_device_id') || '';
    } catch (_e) {
      return '';
    }
  });
  const [micLang, setMicLang] = useState(() => {
    try {
      return localStorage.getItem('mic_lang') || 'es-MX';
    } catch (_e) {
      return 'es-MX';
    }
  });
  const recognitionRef = useRef(null);
  const activeFieldRef = useRef('');
  const stopRequestedRef = useRef(false);
  const startedAtRef = useRef(0);
  const lastEventRef = useRef('');
  const audioStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);

  const speechRecognitionSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const audioMeterSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(navigator?.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    // Best-effort: preload device list if available. Labels require user permission.
    if (!audioMeterSupported || !navigator?.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        setMicDevices(inputs);
      })
      .catch(() => {
        // ignore
      });
  }, [audioMeterSupported]);

  async function refreshMicDevices() {
    if (!audioMeterSupported || !navigator?.mediaDevices?.enumerateDevices) return;
    try {
      // Request permission so device labels become available.
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      setMicDevices(inputs);
      if (!micDeviceId && inputs[0]?.deviceId) {
        setMicDeviceId(inputs[0].deviceId);
      }
    } catch (_err) {
      setMicDebug((prev) =>
        prev ? `${prev} | No se pudo listar micrófonos (permiso)` : 'No se pudo listar micrófonos (permiso)'
      );
    }
  }

  function stopAudioMeter() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (_e) {
        // ignore
      }
      audioCtxRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_e) {
        // ignore
      }
      audioStreamRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  }

  async function startAudioMeter() {
    if (!audioMeterSupported) return;
    stopAudioMeter();

    try {
      const constraints =
        micDeviceId
          ? { audio: { deviceId: { exact: micDeviceId } } }
          : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;
      src.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        // Compute a simple RMS-like level (0..100)
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(100, Math.round(rms * 180));
        setMicLevel(level);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (_err) {
      // If user blocks this permission, SpeechRecognition might still work, so don't hard-fail.
      setMicDebug((prev) =>
        prev ? `${prev} | getUserMedia falló (sin medidor de audio)` : 'getUserMedia falló (sin medidor de audio)'
      );
    }
  }

  function applyTranscript(field, transcript) {
    if (field === 'test') return;
    if (field === 'title') {
      setTitle(transcript);
      return;
    }

    if (field === 'description') {
      setDescription((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
      return;
    }

    // Smart dictation:
    // - If user says "título ..." / "descripción ...", split by keywords.
    // - Otherwise: first sentence becomes title, rest becomes description.
    const lower = transcript.toLowerCase();
    const tituloIdx = lower.indexOf('título');
    const descIdx = lower.indexOf('descripción');

    if (tituloIdx !== -1 || descIdx !== -1) {
      const tStart = tituloIdx !== -1 ? tituloIdx : -1;
      const dStart = descIdx !== -1 ? descIdx : -1;

      if (tStart !== -1) {
        const tEnd = dStart !== -1 && dStart > tStart ? dStart : transcript.length;
        const t = transcript.slice(tStart).replace(/^título\s*[:\-]?\s*/i, '').slice(0, tEnd - tStart).trim();
        if (t) setTitle(t);
      }

      if (dStart !== -1) {
        const d = transcript.slice(dStart).replace(/^descripción\s*[:\-]?\s*/i, '').trim();
        if (d) setDescription(d);
      }
      return;
    }

    const parts = transcript.split(/[.\n:]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    setTitle(parts[0]);
    const rest = parts.slice(1).join('. ').trim();
    if (rest) setDescription(rest);
  }

  function stopVoiceInput() {
    stopRequestedRef.current = true;
    setMicStatus('Deteniendo…');
    if (recognitionRef.current) recognitionRef.current.stop();
    stopAudioMeter();
  }

  function startVoiceInput(field) {
    setLocalError('');
    setLiveTranscript('');
    setMicStatus('Iniciando…');
    setMicDebug('');
    setMicLevel(0);
    stopRequestedRef.current = false;
    activeFieldRef.current = field;
    startedAtRef.current = Date.now();
    lastEventRef.current = 'start()';

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (!speechRecognitionSupported) {
      setLocalError('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    // Start an independent audio level meter to debug "no speech" situations.
    // This helps determine whether the issue is audio input vs recognition.
    startAudioMeter();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = micLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningField(field);
      setMicStatus('Escuchando…');
      setMicDebug('onstart');
    };

    recognition.onaudiostart = () => {
      lastEventRef.current = 'onaudiostart';
      setMicStatus('Audio detectado…');
      setMicDebug('onaudiostart (Chrome detectó el micrófono)');
    };

    recognition.onsoundstart = () => {
      lastEventRef.current = 'onsoundstart';
      setMicStatus('Sonido detectado…');
      setMicDebug('onsoundstart');
    };

    recognition.onspeechstart = () => {
      lastEventRef.current = 'onspeechstart';
      setMicStatus('Voz detectada…');
      setMicDebug('onspeechstart (estás hablando)');
    };

    recognition.onresult = (event) => {
      lastEventRef.current = 'onresult';
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        const txt = res?.[0]?.transcript || '';
        if (res.isFinal) finalText += txt;
        else interimText += txt;
      }

      const interim = interimText.trim();
      const final = finalText.trim();
      // Some browsers only return final results (interim empty). For the "test"
      // mode we want to always show something on screen.
      setLiveTranscript(interim || final);

      if (final) {
        applyTranscript(field, final);
        setMicStatus('Procesado');
        setMicDebug('onresult (final)');
      } else if (interim) {
        setMicDebug('onresult (interim)');
      }
    };

    recognition.onerror = (event) => {
      lastEventRef.current = `onerror:${event.error}`;
      if (event.error === 'not-allowed') {
        setLocalError('Permiso de micrófono denegado.');
        setMicStatus('Permiso denegado');
        setMicDebug('onerror: not-allowed (permiso bloqueado)');
      } else if (event.error === 'no-speech') {
        setMicStatus('No se detectó voz (intenta de nuevo)');
        setMicDebug('onerror: no-speech (no llegó voz)');
      } else if (event.error === 'audio-capture') {
        setLocalError('No se detectó un micrófono disponible en el sistema.');
        setMicStatus('Sin micrófono');
        setMicDebug('onerror: audio-capture (dispositivo no disponible)');
      } else {
        setLocalError('No fue posible capturar audio. Intenta de nuevo.');
        setMicStatus('Error');
        setMicDebug(`onerror: ${event.error || 'unknown'}`);
      }
    };

    recognition.onend = () => {
      const shouldRestart = Boolean(activeFieldRef.current) && !stopRequestedRef.current;
      if (shouldRestart) {
        // Some browsers stop automatically; restart for better UX.
        try {
          recognition.start();
          return;
        } catch (_err) {
          // fallthrough to clean up
        }
      }

      setListeningField('');
      setMicStatus('');
      setLiveTranscript('');
      setMicDebug('');
      stopAudioMeter();
      recognitionRef.current = null;
      stopRequestedRef.current = false;
      activeFieldRef.current = '';
    };

    try {
      recognition.start();
      // If Chrome never fires audio/speech/result, surface a hint quickly.
      setTimeout(() => {
        if (!activeFieldRef.current) return;
        const elapsed = Date.now() - startedAtRef.current;
        const last = lastEventRef.current;
        if (elapsed > 2500 && (last === 'start()' || last === 'onstart')) {
          setMicStatus('Sin señal de audio…');
          setMicDebug(
            'No llegaron eventos de audio/voz. Revisa permiso del sitio y el micrófono seleccionado en Chrome.'
          );
        }
      }, 2600);
    } catch (_err) {
      setLocalError('No se pudo iniciar el micrófono. Revisa permisos del navegador.');
      setMicStatus('No se pudo iniciar');
      setListeningField('');
      setLiveTranscript('');
      setMicDebug('start() lanzó excepción');
      stopAudioMeter();
      recognitionRef.current = null;
      stopRequestedRef.current = false;
      activeFieldRef.current = '';
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLocalError('');

    const t = title.trim();
    const d = description.trim();
    if (!t) {
      setLocalError('El título es obligatorio.');
      return;
    }

    let due_at = null;
    let remind_at = null;

    if (dueAtLocal) {
      const dueMs = Date.parse(dueAtLocal);
      if (!Number.isFinite(dueMs)) {
        setLocalError('Fecha inválida.');
        return;
      }
      due_at = new Date(dueMs).toISOString();

      const off = Number(reminderOffsetMin);
      if (Number.isFinite(off) && off >= 0) {
        const remindMs = dueMs - off * 60_000;
        remind_at = new Date(remindMs).toISOString();
      }
    }

    await onCreate({ title: t, description: d, due_at, remind_at });
    setTitle('');
    setDescription('');
    setDueAtLocal('');
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <div className="fw-semibold">Crear tarea</div>
          <div className="text-secondary small">
            Puedes escribir o dictar. Para dictado inteligente di: “título … descripción …”
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {speechRecognitionSupported ? (
            <span className="badge text-bg-secondary">Mic disponible</span>
          ) : (
            <span className="badge text-bg-warning">Mic no soportado</span>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="vstack gap-3">
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Idioma de micrófono</label>
            <select
              className="form-select"
              value={micLang}
              disabled={disabled || Boolean(listeningField)}
              onChange={(e) => {
                const v = e.target.value;
                setMicLang(v);
                try {
                  localStorage.setItem('mic_lang', v);
                } catch (_e) {
                  // ignore
                }
              }}
            >
              <option value="es-MX">Español (México) - es-MX</option>
              <option value="es-ES">Español (España) - es-ES</option>
              <option value="en-US">English (US) - en-US</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Micrófono (prueba de nivel)</label>
            <div className="input-group">
              <select
                className="form-select"
                value={micDeviceId}
                disabled={disabled || Boolean(listeningField) || !audioMeterSupported}
                onChange={(e) => {
                  const v = e.target.value;
                  setMicDeviceId(v);
                  try {
                    localStorage.setItem('mic_device_id', v);
                  } catch (_err) {
                    // ignore
                  }
                }}
              >
                <option value="">
                  Predeterminado del sistema
                </option>
                {micDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Micrófono (${d.deviceId.slice(0, 6)}…)`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={disabled || Boolean(listeningField) || !audioMeterSupported}
                onClick={refreshMicDevices}
                title="Actualizar lista (requiere permiso)"
              >
                Actualizar
              </button>
            </div>
            <div className="form-text text-secondary">
              El reconocimiento de voz de Chrome usa el micrófono predeterminado del navegador/sistema.
              Este selector ayuda a diagnosticar el nivel de entrada.
            </div>
          </div>
          <div className="col-12 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-outline-warning w-100"
              disabled={disabled || Boolean(listeningField) || !speechRecognitionSupported}
              onClick={() => startVoiceInput('test')}
            >
              Probar micrófono
            </button>
          </div>
        </div>

        <div>
          <label className="form-label">Título</label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Comprar leche"
            disabled={disabled}
          />
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label">Fecha y hora</label>
            <input
              className="form-control"
              type="datetime-local"
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
              disabled={disabled}
            />
            <div className="form-text text-secondary">
              Selecciona desde el calendario. Si no eliges fecha, no habrá recordatorio.
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Recordatorio</label>
            <select
              className="form-select"
              value={reminderOffsetMin}
              onChange={(e) => setReminderOffsetMin(e.target.value)}
              disabled={disabled || !dueAtLocal}
            >
              <option value="0">A la hora exacta</option>
              <option value="5">5 min antes</option>
              <option value="10">10 min antes</option>
              <option value="30">30 min antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 día antes</option>
            </select>
            <div className="form-text text-secondary">
              Automático mientras la app esté abierta (y notificación del navegador si la permites).
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={disabled || Boolean(listeningField) || !speechRecognitionSupported}
            onClick={() => startVoiceInput('title')}
          >
            Dictar título
          </button>
          <button
            type="button"
            className="btn btn-outline-light"
            disabled={disabled || Boolean(listeningField) || !speechRecognitionSupported}
            onClick={() => startVoiceInput('description')}
          >
            Dictar descripción
          </button>
          <button
            type="button"
            className="btn btn-outline-info"
            disabled={disabled || Boolean(listeningField) || !speechRecognitionSupported}
            onClick={() => startVoiceInput('smart')}
          >
            Dictado inteligente
          </button>
          {listeningField ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={disabled}
              onClick={stopVoiceInput}
            >
              Detener
            </button>
          ) : null}
          {micStatus ? (
            <span className="text-secondary small align-self-center">{micStatus}</span>
          ) : null}
        </div>

        {listeningField ? (
          <div className="mic-transcript">
            <div className="small text-secondary mb-1">
              {listeningField === 'test' && 'Prueba de micrófono'}
              {listeningField === 'title' && 'Escuchando (título)'}
              {listeningField === 'description' && 'Escuchando (descripción)'}
              {listeningField === 'smart' && 'Escuchando (dictado inteligente)'}
            </div>
            <div>{liveTranscript || <span className="text-secondary">Habla ahora…</span>}</div>
            <div className="mt-2">
              <div className="d-flex justify-content-between small text-secondary mb-1">
                <span>Nivel de entrada</span>
                <span>{audioMeterSupported ? `${micLevel}%` : 'No disponible'}</span>
              </div>
              <div className="progress" style={{ height: 8 }}>
                <div
                  className={`progress-bar ${micLevel > 15 ? 'bg-success' : 'bg-secondary'}`}
                  role="progressbar"
                  style={{ width: `${micLevel}%` }}
                  aria-valuenow={micLevel}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              {audioMeterSupported && micLevel > 0 && micLevel < 5 ? (
                <div className="alert alert-warning py-2 px-3 mt-2 mb-0">
                  Nivel muy bajo. En Windows sube el volumen de entrada o cambia el micrófono
                  (Configuración → Sistema → Sonido → Entrada). En Chrome revisa
                  `chrome://settings/content/microphone`.
                </div>
              ) : null}
            </div>
            {micDebug ? (
              <div className="text-secondary small mt-2">
                Diagnóstico: {micDebug}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles opcionales..."
            rows={4}
            disabled={disabled}
          />
        </div>

        {localError ? <div className="alert alert-danger mb-0">{localError}</div> : null}

        <div className="d-flex justify-content-end">
          <button className="btn btn-primary" type="submit" disabled={disabled}>
            Crear tarea
          </button>
        </div>
      </form>
    </div>
  );
}

