import { useDayTheme } from './hooks/useDayTheme'
import Greeting from './components/Greeting'
import DayCard from './components/DayCard'
import Notes from './components/Notes'
import MoodTracker from './components/MoodTracker'
import TodayTasks from './components/TodayTasks'
import Countdowns from './components/Countdowns'
import SnakeGame from './components/SnakeGame'
import ShooterRange from './components/ShooterRange'
import SkyBody from './components/SkyBody'
import AiChat from './components/AiChat'
import './App.css'

export default function App() {
  const { theme, now } = useDayTheme()

  const style = {
    '--accent': theme.accent,
    '--tint': theme.tint,
    '--text': theme.text,
    '--text-soft': theme.textSoft,
    '--surface': theme.surface,
    '--surface-border': theme.surfaceBorder,
    '--g1': theme.gradient[0],
    '--g2': theme.gradient[1],
    '--g3': theme.gradient[2],
  }

  return (
    <div className={`app app--${theme.scheme}`} style={style}>
      <div className="app__bg" aria-hidden="true">
        <SkyBody now={now} />
      </div>
      <div className="app__content">
        <Greeting theme={theme} now={now} />
        <div className="app__stack">
          <AiChat />
          <DayCard />
          <SnakeGame />
          <ShooterRange />
          <MoodTracker />
          <TodayTasks />
          <Countdowns />
          <Notes />
        </div>
      </div>
    </div>
  )
}
