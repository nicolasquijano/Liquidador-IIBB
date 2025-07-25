package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Crea una instancia de la App struct que contiene toda nuestra lógica
	app := NewApp()

	// --- Creación del Menú de la Aplicación ---
	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("Archivo")
	fileMenu.AddText("Salir", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		runtime.Quit(app.ctx)
	})

	viewMenu := appMenu.AddSubmenu("Ver")
	viewMenu.AddText("Alternar Tema", keys.CmdOrCtrl("t"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "toggle-theme")
	})
	// --- Fin de la Creación del Menú ---

	// Configuración de la aplicación Wails
	err := wails.Run(&options.App{
		Title:  "Liquidador IIBB - Convenio Multilateral",
		Width:  1440,
		Height: 900,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:      appMenu,
		OnStartup: app.startup,
		// LA LÍNEA MÁS IMPORTANTE:
		// "Bind" expone la instancia de 'app' al frontend.
		// Todas las funciones públicas de 'app' (con mayúscula inicial)
		// estarán disponibles en JavaScript bajo `window.go.main.App`.
		Bind: []interface{}{
			app,
		},
		// Estilos de la ventana
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1}, // El fondo real se controla por CSS
	})

	if err != nil {
		log.Fatal(err)
	}
}
