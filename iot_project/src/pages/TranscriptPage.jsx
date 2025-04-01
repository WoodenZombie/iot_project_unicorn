import { useParams } from 'react-router-dom'
import { getTranscript } from '../services/api'
import { useState, useEffect } from 'react'

export default function TranscriptPage() {
  const { sessionId } = useParams()
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const data = await getTranscript(sessionId)
        setTranscript(data.text)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTranscript()
  }, [sessionId])

  if (loading) return <div>Loading transcript...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="transcript-page">
      <h1>Transcript</h1>
      <div className="transcript-content">
        {transcript || 'No transcript available'}
      </div>
    </div>
  )
}