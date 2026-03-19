import Journal from '../components/journal/journal'
import ExerciseTracker from '../components/journal/exercise-tracker'

const JournalPage = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 lowercase">journal hub</h1>
      <Journal />
      {/* exercise integrated */}
      <ExerciseTracker />
    </div>
  )
}

export default JournalPage

