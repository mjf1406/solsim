import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  formatDiameterKm,
  type SizePageModel,
  type SizeRow,
} from "./-data"

export function SolarSystemSizeDataTables({ model }: { model: SizePageModel }) {
  return (
    <>
      <section className="space-y-3" aria-labelledby="size-sol-heading">
        <h2 id="size-sol-heading" className="font-heading text-lg">
          Sol
        </h2>
        {model.sun ? (
          <BodyTable rows={[model.sun]} caption="The Sun" />
        ) : (
          <p className="text-sm text-muted-foreground">
            No star entry in snapshot.
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="size-planets-heading">
        <h2 id="size-planets-heading" className="font-heading text-lg">
          Planets and moons
        </h2>
        <PlanetAccordion
          sections={model.planets}
          emptyHint="No planets in snapshot."
        />
      </section>

      <section className="space-y-3" aria-labelledby="size-dwarf-heading">
        <h2 id="size-dwarf-heading" className="font-heading text-lg">
          Dwarf planets and moons
        </h2>
        <PlanetAccordion
          sections={model.dwarfPlanets}
          emptyHint="No dwarf planets in snapshot."
        />
      </section>

      <section className="space-y-3" aria-labelledby="size-asteroids-heading">
        <h2 id="size-asteroids-heading" className="font-heading text-lg">
          Largest asteroids (in snapshot)
        </h2>
        <BodyTable
          rows={model.asteroids}
          caption="Five largest asteroids by diameter in this dataset"
        />
      </section>

      <section className="space-y-3" aria-labelledby="size-comets-heading">
        <h2 id="size-comets-heading" className="font-heading text-lg">
          Largest comets (in snapshot)
        </h2>
        <BodyTable
          rows={model.comets}
          caption="Five largest comet nuclei by diameter in this dataset"
        />
      </section>
    </>
  )
}

function BodyTable({ rows, caption }: { rows: SizeRow[]; caption: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries to show.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[16rem] text-left text-sm">
        <caption className="border-b px-3 py-2 text-left text-muted-foreground">
          {caption}
        </caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Diameter
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 text-muted-foreground tabular-nums">
                {formatDiameterKm(row.diameterKm)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlanetAccordion({
  sections,
  emptyHint,
}: {
  sections: SizePageModel["planets"]
  emptyHint: string
}) {
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>
  }

  return (
    <Accordion type="multiple" className="w-full">
      {sections.map((section) => (
        <AccordionItem value={section.body.id} key={section.body.id}>
          <AccordionTrigger className="px-3 text-left text-base">
            <span className="font-medium">{section.body.name}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              {formatDiameterKm(section.body.diameterKm)}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-4">
            {section.moons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No moons with diameters in snapshot.
              </p>
            ) : (
              <BodyTable
                rows={section.moons}
                caption={`Largest moons of ${section.body.name} (up to five, by diameter in snapshot)`}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
