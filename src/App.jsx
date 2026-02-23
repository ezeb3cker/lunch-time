import React from "react";
import { CssBaseline, ThemeProvider, createTheme, Box } from "@mui/material";
import LunchPanel from "./components/LunchPanel.jsx";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2"
    }
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
          alignItems: "center",
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

