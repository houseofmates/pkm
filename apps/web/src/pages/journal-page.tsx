import Journal from '../components/journal/journal'
import ExerciseTracker from '../components/journal/exercise-tracker'

const JournalPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 bg-black text-amber-50 min-h-screen">
      <h1 className="text-3xl  mb-8 lowercase text-amber-200">journal hub</h1>
      <Journal />
      {/* exercise integrated */}
      <div className="mt-6">
        <ExerciseTracker />
      </div>
    </div>
  )
}

export default JournalPage
