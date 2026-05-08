import { createFileRoute } from "@tanstack/react-router"
import { FooterSection } from "../-home-components/footer"
import { AboutDonateSection } from "./-components/donation"

export const Route = createFileRoute("/_web/about/")({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="mx-auto flex w-full flex-col items-stretch">
      <article className="w-full max-w-3xl self-center px-6 pt-6 pb-14 lg:px-8">
        <header className="mb-10 space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            About
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Why this project exists, how it is built, how to support it, and who
            maintains it
          </p>
        </header>

        <div className="space-y-10">
          <section id="objective" className="scroll-mt-28 space-y-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Objective
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              One day, when I was brainstorming ideas to enhance the education
              of my students in regards to the Solar System, the basic idea of
              this site popped into my head. The{" "}
              <a
                href="https://ichef.bbci.co.uk/images/ic/480xn/p0mf4mzp.png"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                simplified
              </a>{" "}
              <a
                href="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Solar_System_true_color_%28captions%29.jpg/1920px-Solar_System_true_color_%28captions%29.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                educational
              </a>{" "}
              <a
                href="https://k8schoollessons.com/wp-content/uploads/2013/05/solar-system.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                model
              </a>{" "}
              that we teach elementary school children is excellent, but it is
              missing so much. This site tries to provide the &quot;so
              much&quot; that it is missing for the students at a level that is
              accessible to them.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              It&apos;s inspired by{" "}
              <a
                href="https://en.wikipedia.org/wiki/Inquiry-based_learning"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                inquiry-based learning
              </a>{" "}
              in a loose sense because students can explore the Solar System
              simulation to their heart&apos;s content in any way they want. For
              example, let&apos;s say we have a student named Kelly. She opens
              the Solar System simulation after being explicitly taught the
              aforementioned simplified model. She notices all of the comets,
              asteroids, dwarf planets, and moons that she didn&apos;t learn
              about before. She is freely able to click on them to learn more
              about them!
            </p>
            <p className="leading-relaxed text-muted-foreground">
              The best part? She gets to choose the reading level for herself!
              Each level adds information that is accessible for that reading
              level, so if she wants a challenge, she merely needs to choose the
              next reading level to see what else she learned, whether
              that&apos;s new words, new concepts, or simply more detailed
              information. She can continue to explore the simulation at her own
              pace, and she can even share what she learned with her classmates!
            </p>
          </section>

          <section id="methods" className="scroll-mt-28 space-y-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Methods
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Learn about how everything on the site was created.
            </p>
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              The Orbits
            </h3>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              <p>
                It&apos;s important to know that this site uses{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Kepler_orbit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Keplerian orbits
                </a>{" "}
                for the orbits of all celestial bodies in the simulation. While
                Keplerian orbits are not the most accurate methdod for
                displaying orbits, they are good enough for NASA for the{" "}
                <a
                  href="https://ssd.jpl.nasa.gov/planets/approx_pos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  <span className="italic">
                    &quot;...planning and design of spacecraft missions&quot;
                  </span>
                </a>
                .
              </p>
              <p>
                <a
                  href="https://github.com/mjf1406/solar-system/blob/main/public/data/solar_system_data.json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Data
                </a>{" "}
                from{" "}
                <a
                  href="https://ssd.jpl.nasa.gov/horizons/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  NASA&apos;s Horizons system
                </a>{" "}
                were used to compute the Keplerian orbits of...
              </p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>all eight (8) planets,</li>
                <li>
                  the five (5) IAU-recognized dwarf planets plus ten (10) more
                  that are under consideration,
                </li>
                <li>
                  the four hundred fifty-three (453) natural satellites of all
                  the planets and dwarf planets that are available in the
                  Horizons system,
                </li>
                <li>
                  ten (10) notable asteroids plus twenty-nine (29) more, and
                </li>
                <li>ten (10) notable comets plus ten (10) more.</li>
              </ul>
            </div>

            <h3 className="font-heading text-lg font-semibold tracking-tight">
              The Art
            </h3>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              <p>
                All artwork on the site is either created by me, created by
                another human, or drawn with code. AI was <b>NOT</b> used to
                create any art assets in this project.
              </p>
              <p>
                The below is a list of art used on the website that was not made
                by me.
              </p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>
                  Sun with Sunglasses:{" "}
                  <a
                    href="https://www.magnific.com/free-vector/cool-sun-wearing-sunglasses_132098781.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Image by juicy_fish on Magnific
                  </a>
                </li>
              </ul>
            </div>

            <h3 className="font-heading text-lg font-semibold tracking-tight">
              The Code
            </h3>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              <p>
                AI was used to generate some of the code for this project.
                Specifically, it was used to help to create the UI and UI
                interactions. To be frank, I could have written this code by
                myself, but it would have taken me a lot longer and I wanted to
                launch the site before my students would need it in order to
                ensure they could use it in class to explore how the Solar
                System looks and works after learning the standard educational
                model, so I used AI to help me make this more quickly.
              </p>
              <p>
                I wrote all the Keplerian orbit calculations by myself because I
                thought it would be fun to learn.
              </p>
            </div>

            <h3 className="font-heading text-lg font-semibold tracking-tight">
              The Content
            </h3>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              <p>
                All of the reading content on the site was written by me or
                another human. Citations make the content stronger and they are
                available where necessary.
              </p>
            </div>
          </section>

          <AboutDonateSection />

          <section id="author" className="scroll-mt-28 space-y-3">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Author
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              🚧 UNDER CONSTRUCTION 🚧
            </p>
          </section>
        </div>
      </article>
      <FooterSection layout="narrow" />
    </div>
  )
}
