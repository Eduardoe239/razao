const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 380,
    minHeight: 600,
    title: 'O Razão — Finanças com Lógica',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#07101f'
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Diretorio seguro de dados do usuario no Desktop Windows/Mac/Linux
const getUserDataPath = () => {
  const dir = path.join(app.getPath('userData'), 'RazaoData');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'razao_app_db.json');
};

// Manipuladores de IPC para Persistência Nativa de Dados no Desktop
ipcMain.handle('desktop:saveState', async (event, stateData) => {
  try {
    const filePath = getUserDataPath();
    fs.writeFileSync(filePath, JSON.stringify(stateData, null, 2), 'utf8');
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Erro ao salvar estado nativo no Desktop:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('desktop:loadState', async () => {
  try {
    const filePath = getUserDataPath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao carregar estado nativo no Desktop:', err);
    return null;
  }
});

// Diálogos Nativos para Importação/Exportação no .exe
ipcMain.handle('desktop:openFileDialog', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'Todos os Arquivos', extensions: ['*'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const content = fs.readFileSync(result.filePaths[0], 'utf8');
  return { path: result.filePaths[0], content };
});

ipcMain.handle('desktop:saveFileDialog', async (event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'razao-backup.json',
    filters: [{ name: 'Backup JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, 'utf8');
  return true;
});

// Controles Nativos de Janela
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
