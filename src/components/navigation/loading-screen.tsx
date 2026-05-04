export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
      <img
        src="/sun-with-sunglasses.webp"
        alt=""
        className="h-40 w-40 animate-[spin_6s_linear_infinite] select-none"
        draggable={false}
      />
      <p className="mt-6 font-heading text-lg tracking-wide">Loading</p>

      <a
        href="https://www.magnific.com/free-vector/cool-sun-wearing-sunglasses_132098781.htm"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground hover:text-foreground"
      >
        Image by juicy_fish on Magnific
      </a>
    </div>
  )
}
