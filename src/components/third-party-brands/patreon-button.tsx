export function PatreonDonation() {
  return (
    <a
      href="https://www.patreon.com/MichaelFitzgerald"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block transition-transform hover:scale-105 hover:shadow-xl"
    >
      <img
        src="/brands/become_a_patron_button.png"
        alt="Become a Patron on Patreon"
        width={225}
        height={100}
        className="h-auto max-w-full"
        decoding="async"
      />
    </a>
  )
}
