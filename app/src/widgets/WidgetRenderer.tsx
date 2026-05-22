import type { WidgetConfig, ThemeId } from '../types'
import PrayerTimesWidget from './PrayerTimesWidget'
import MediaWidget from './MediaWidget'
import TickerWidget from './TickerWidget'
import WeatherWidget from './WeatherWidget'
import RSSWidget from './RSSWidget'

interface Props {
  widget: WidgetConfig
  cityId: number
  theme: ThemeId
}

export default function WidgetRenderer({ widget, cityId, theme }: Props) {
  switch (widget.type) {
    case 'prayer_times':
      return <PrayerTimesWidget cityId={cityId} theme={theme} config={widget.config} />
    case 'media':
      return <MediaWidget config={widget.config} />
    case 'ticker':
      return <TickerWidget config={widget.config} />
    case 'weather':
      return <WeatherWidget config={widget.config} theme={theme} />
    case 'rss':
      return <RSSWidget config={widget.config} />
    default:
      return null
  }
}
