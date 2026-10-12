async function testApi() {
  const payload = {
    skill: 'React.js',
    level: 'easy'
  }

  console.log('Sending request to /api/generate-questions...')
  try {
    const res = await fetch('http://localhost:3000/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      console.error(`HTTP error! Status: ${res.status}`)
      const text = await res.text()
      console.error('Response body:', text)
      return
    }

    const data = await res.json()
    console.log(`Success! Received ${data.questions?.length} questions.`)
    if (data.questions && data.questions.length > 0) {
      console.log('First question:', data.questions[0].question)
      console.log('Options:', data.questions[0].options)
      console.log('Concepts:', data.questions[0].concepts)
      console.log('Question IDs returned:', data.questions.map(q => q.id))
    }
  } catch (err) {
    console.error('Fetch error:', err.message)
  }
}

async function run() {
  console.log('--- Test Run 1 ---')
  await testApi()
  console.log('\n--- Test Run 2 ---')
  await testApi()
}

// Wait 5 seconds to ensure dev server is up
console.log('Waiting 5s for Next.js to be fully ready...')
setTimeout(run, 5000)
