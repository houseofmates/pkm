import Journal from '../components/journal/journal'
import ExerciseTracker from '../components/journal/exercise-tracker'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const JournalPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 bg-black text-amber-50 min-h-screen">
      <h1 className="text-3xl  mb-8 lowercase text-amber-200">journal hub</h1>
      <ErrorBoundary fallback={<div className="p-6 text-center">Journal is temporarily unavailable. Please try again later.</div>}>
        <Journal />
      </ErrorBoundary>
      {/* exercise integrated */}
      <div className="mt-6">
        <ErrorBoundary fallback={<div className="p-6 text-center">Exercise tracker is temporarily unavailable. Please try again later.</div>}>
          <ExerciseTracker />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default JournalPage
