import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { createUser, getUsers, updateUser } from "../api/lunchApi.js";

const PREDEFINED_DURATIONS = [
  { label: "30 minutos", value: 30 },
  { label: "45 minutos", value: 45 },
  { label: "1 hora", value: 60 },
  { label: "1h 30min", value: 90 },
  { label: "2 horas", value: 120 },
  { label: "Personalizado", value: "custom" }
];

const STEPS = ["Definir mensagem", "Definir horário"];

export default function LunchPanel() {
  const panelContainerRef = useRef(null);

  const [userId, setUserId] = useState("");
  const [systemId, setSystemId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [sendMessage, setSendMessage] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [message, setMessage] = useState("");
  const [userRecordId, setUserRecordId] = useState(null);
  const [status, setStatus] = useState({ type: "info", text: "Carregando dados do usuário..." });
  const [showConfig, setShowConfig] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  // Estados para horário
  const [durationType, setDurationType] = useState("60");
  const [customTime, setCustomTime] = useState("01:00");
  const [lunchEndTime, setLunchEndTime] = useState(null);

  const showStatus = (type, text) => {
    setStatus({ type, text });
    if (window.WlExtension && window.WlExtension.alert) {
      const variant = type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning';
      window.WlExtension.alert({ message: text, variant });
    }
  };



  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setStatus({ type: "info", text: "Carregando dados do usuário..." });

        if (typeof window === "undefined") {
          throw new Error("Ambiente de janela não disponível.");
        }

        const wl = window.WlExtension;

        if (!wl || typeof wl.getInfoUser !== "function") {
          showStatus(
            "error",
            "Biblioteca WlExtension não está disponível. Verifique se o script foi carregado."
          );
          return;
        }

        const data = await wl.getInfoUser();
        if (cancelled) return;

        const resolvedUserId = data?.userId;
        const resolvedSystemKey = data?.systemKey;

        if (!resolvedUserId || !resolvedSystemKey) {
          setStatus({
            type: "error",
            text: "Não foi possível obter userId e systemKey da WlExtension."
          });
          return;
        }

        setUserId(resolvedUserId);
        setSystemId(resolvedSystemKey);

        const users = await getUsers(resolvedUserId, resolvedSystemKey);

        if (!cancelled && users.length > 0) {
          const u = users[0];
          setUserRecordId(u._id || null);
          const isActive = String(u.active) === "true";
          setActive(isActive);
          const hasMessage = !!u.message;
          setSendMessage(hasMessage);
          setMessage(u.message || "");

          if (isActive) {
            setShowConfig(false);
            const key = `lunchEndTime_${resolvedUserId}_${resolvedSystemKey}`;
            const storedEndTime = window.localStorage.getItem(key);
            if (storedEndTime) {
              setLunchEndTime(Number(storedEndTime));
            }
          }

          setStatus({
            type: "success",
            text: isActive
              ? "Almoço já está ativo para este usuário."
              : "Usuário carregado. Almoço não está ativo."
          });
        } else if (!cancelled) {
          setStatus({
            type: "info",
            text: "Usuário não encontrado. Preencha os dados para iniciar o almoço."
          });
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({
            type: "error",
            text: "Erro ao carregar dados do usuário. Tente novamente."
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const parseTimeToMinutes = (timeStr) => {
    const parts = timeStr.split(":");
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };

  useEffect(() => {
    let timerId;
    let endTimerId;

    if (active && userId && systemId) {
      const key = `lunchStart_${userId}_${systemId}`;
      const endKey = `lunchEndTime_${userId}_${systemId}`;
      let start = window.localStorage.getItem(key);
      let endTime = lunchEndTime;

      if (!start) {
        start = Date.now().toString();
        window.localStorage.setItem(key, start);
      }

      if (!endTime && lunchEndTime === null) {
        const durationMinutes = durationType === "custom" ? parseTimeToMinutes(customTime) : Number(durationType);
        if (durationMinutes > 0) {
          endTime = Date.now() + durationMinutes * 60 * 1000;
          setLunchEndTime(endTime);
          window.localStorage.setItem(endKey, endTime.toString());
        }
      }

      const startMs = Number(start);
      const endMs = endTime || startMs + 60 * 60 * 1000;

      const tick = () => {
        const now = Date.now();
        const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
        setElapsedSeconds(diffSec);

        if (endTime && now >= endMs) {
          handleAutoEndLunch();
        }
      };

      tick();
      timerId = window.setInterval(tick, 1000);
    } else {
      setElapsedSeconds(0);
      if (endTimerId) {
        clearTimeout(endTimerId);
      }
    }

    return () => {
      if (timerId) {
        window.clearInterval(timerId);
      }
      if (endTimerId) {
        clearTimeout(endTimerId);
      }
    };
  }, [active, userId, systemId, lunchEndTime, durationType, customTime]);

  const handleAutoEndLunch = async () => {
    if (!userId || !systemId || !userRecordId) return;

    try {
      setSaving(true);
      setStatus({
        type: "info",
        text: "Horário de almoço finalizado automaticamente."
      });

      const payload = {
        _id: userRecordId,
        userId,
        systemId,
        message: "",
        active: false,
        sendMessage: false,
        transferAttendance: false
      };

      await updateUser(payload);

      setActive(false);
      setShowConfig(true);
      setActiveStep(0);
      setSendMessage(false);
      setTransfer(false);
      setMessage("");

      const key = `lunchStart_${userId}_${systemId}`;
      const endKey = `lunchEndTime_${userId}_${systemId}`;
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(endKey);
      setLunchEndTime(null);

      setStatus({
        type: "success",
        text: "Almoço encerrado automaticamente."
      });
    } catch (e) {
      setStatus({
        type: "error",
        text: "Erro ao encerrar almoço automaticamente."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleToggleLunch = async () => {
    if (!userId || !systemId) {
      setStatus({ type: "error", text: "Contexto de usuário inválido." });
      return;
    }

    const durationMinutes = durationType === "custom" ? parseTimeToMinutes(customTime) : Number(durationType);
    if (durationMinutes <= 0) {
      setStatus({
        type: "error",
        text: "Selecione ou informe um horário válido."
      });
      return;
    }

    const nextActive = !active;

    const finalMessage = sendMessage ? message.trim() : "";

    const payload = {
      _id: userRecordId,
      userId,
      systemId,
      message: sendMessage ? finalMessage : "",
      active: nextActive,
      sendMessage: nextActive ? sendMessage : false,
      transferAttendance: nextActive ? transfer : false
    };

    try {
      setSaving(true);
      setStatus({
        type: "info",
        text: nextActive ? "Iniciando almoço..." : "Encerrando almoço..."
      });

      let result;
      if (!userRecordId && nextActive) {
        result = await createUser(payload);
      } else {
        result = await updateUser(payload);
      }

      if (result && result._id) {
        setUserRecordId(result._id);
      } else if (!userRecordId) {
        const refreshed = await getUsers(userId, systemId);
        if (refreshed.length > 0) {
          setUserRecordId(refreshed[0]._id || null);
        }
      }

      setActive(nextActive);

      const key = `lunchStart_${userId}_${systemId}`;
      const endKey = `lunchEndTime_${userId}_${systemId}`;

      if (nextActive) {
        setShowConfig(false);
        const startTime = Date.now();
        const endTime = startTime + durationMinutes * 60 * 1000;
        window.localStorage.setItem(key, startTime.toString());
        window.localStorage.setItem(endKey, endTime.toString());
        setLunchEndTime(endTime);
      } else {
        setShowConfig(true);
        setActiveStep(0);
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(endKey);
        setSendMessage(false);
        setTransfer(false);
        setMessage("");
        setLunchEndTime(null);
      }
      setStatus({
        type: "success",
        text: nextActive
          ? "Almoço iniciado com sucesso."
          : "Almoço encerrado com sucesso."
      });
    } catch (e) {
      setStatus({
        type: "error",
        text: "Erro ao salvar os dados de almoço. Tente novamente."
      });
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const buttonLabel = active ? "Encerrar almoço" : "Iniciar almoço";
  const disabled = loading || saving || !userId || !systemId;

  return (
    <>
      <Box
        ref={panelContainerRef}
        sx={{
          width: 350,
          maxWidth: "100%",
          height: 880,
          maxHeight: "100vh",
          position: "relative"
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            p: 2,
            boxSizing: "border-box"
          }}
        >
          <Box mb={1}>
            <Typography variant="h6">Horário de almoço</Typography>
            <Typography variant="body2" color="text.secondary">
              Configure o intervalo de almoço para este usuário.
            </Typography>
          </Box>

        {(loading || saving) && (
          <Box mb={1}>
            <LinearProgress />
          </Box>
        )}

        {showConfig && (
          <Box mb={2}>
            <Stepper activeStep={activeStep}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        <Stack
          spacing={2}
          sx={{
            flex: 1,
            overflowY: "auto",
            pr: 0.5,
            pt: 1
          }}
        >
          {showConfig ? (
            <>
              {activeStep === 0 ? (
                <>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={sendMessage}
                          onChange={(e) => {
                            setSendMessage(e.target.checked);
                            if (!e.target.checked) {
                              setMessage("");
                            }
                          }}
                          disabled={disabled}
                        />
                      }
                      label="Enviar mensagem?"
                    />
                  </Box>

                  {sendMessage && (

                    <TextField
                      label="Mensagem de almoço"
                      placeholder="Digite a mensagem de almoço..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      multiline
                      minRows={3}
                      disabled={disabled}
                      fullWidth
                    />
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNextStep}
                    disabled={disabled}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Definir horário
                  </Button>
                </>
              ) : (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Horário</InputLabel>
                    <Select
                      value={durationType}
                      label="Horário"
                      onChange={(e) => setDurationType(e.target.value)}
                      disabled={disabled}
                    >
                      {PREDEFINED_DURATIONS.map((dur) => (
                        <MenuItem key={dur.value} value={dur.value}>
                          {dur.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {durationType === "custom" && (
                    <TextField
                      label="Duração (hh:mm)"
                      placeholder="01:30"
                      value={customTime}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (true) {
                          if (value.length <= 5) {
                            let formatted = value;
                            if (formatted.length >= 3) {
                              formatted = formatted.slice(0, 2) + ":" + formatted.slice(2, 4);
                            }
                            setCustomTime(formatted || "00:00");
                          }
                        }
                      }}
                      disabled={disabled}
                      fullWidth
                      inputProps={{ maxLength: 5 }}
                      helperText="Formato: HH:MM (ex: 01:30 para 1 hora e 30 minutos)"
                    />
                  )}

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={transfer}
                          onChange={(e) => setTransfer(e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label="Transferir atendimento?"
                    />
                  </Box>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleBackStep}
                      disabled={disabled}
                      sx={{ flex: 1 }}
                    >
                      Voltar
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleToggleLunch}
                      disabled={disabled}
                      sx={{ flex: 1 }}
                    >
                      {buttonLabel}
                    </Button>
                  </Box>
                </>
              )}
            </>
          ) : (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Vai aproveitar o seu almoço
              </Typography>
              <Typography variant="h4">
                {formatTime(elapsedSeconds)}
              </Typography>
              {lunchEndTime && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Encerra em: {new Date(lunchEndTime).toLocaleTimeString("pt-BR")}
                </Typography>
              )}
            </Box>
          )}

          {!showConfig && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleToggleLunch}
              disabled={disabled}
              fullWidth
              sx={{ mt: 1 }}
            >
              {buttonLabel}
            </Button>
        </Stack>
        </Paper>
      </Box>
    </>
  );
}
