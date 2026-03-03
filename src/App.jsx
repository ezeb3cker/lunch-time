import React from "react";
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import LunchPanel from "./components/LunchPanel.jsx";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      // Azul original substituído pela cor solicitada
      main: "#192D3E"
    }
  },
  typography: {
    // Utilizar Roboto como fonte principal
    fontFamily: 'Roboto, sans-serif'
  }
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#f0f2f5",
          p: 2
        }}
      >
        <LunchPanel />
      </Box>
    </ThemeProvider>
  );
}

