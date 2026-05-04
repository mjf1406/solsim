import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import "./index.css"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"
import { ThemeProvider } from "./components/theme/theme-provider"
import LoadingScreen from "./components/navigation/loading-screen"

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPendingComponent: LoadingScreen,
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById("root")!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </StrictMode>
  )
}
