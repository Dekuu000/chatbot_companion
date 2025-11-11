import React from 'react'

export type AdvisorResponse = {
  headline: string
  keyInsights: string[]
  nextSteps: string[]
  followUp: string
}

export default function AdvisorCardMinimal({ data }: { data: AdvisorResponse }) {
  return (
    <article className="max-w-2xl mx-auto bg-white border rounded-lg shadow-sm p-5">
      <header className="mb-3">
        <h3 className="text-lg font-semibold leading-tight">{data.headline}</h3>
      </header>

      <section className="mb-3">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Key Insights</h4>
        <ul className="list-none space-y-2">
          {data.keyInsights.map((k, i) => (
            <li key={i} className="text-sm text-gray-800">
              • {k}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-3">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Next Steps</h4>
        <div className="space-y-2">
          {data.nextSteps.map((s, i) => (
            <div key={i} className="text-sm text-gray-800 flex items-start">
              <span className="mr-3 text-green-600">✅</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="pt-3 border-t text-sm text-gray-700">
        <strong>Follow-up:</strong> {data.followUp}
      </footer>
    </article>
  )
}

