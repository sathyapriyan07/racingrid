// Normalize Ergast API responses to F1Base schema

export function normalizeDrivers(raw, source = 'ergast') {
  if (source === 'ergast') {
    const list = raw?.MRData?.DriverTable?.Drivers || raw
    return list.map(d => ({
      name: `${d.givenName} ${d.familyName}`,
      code: d.code || null,
      nationality: d.nationality || null,
      dob: d.dateOfBirth || null,
      image_url: null,
    }))
  }
  // Generic flat JSON
  return (Array.isArray(raw) ? raw : [raw]).map(d => ({
    name: d.name || `${d.givenName || ''} ${d.familyName || ''}`.trim(),
    code: d.code || d.driverCode || null,
    nationality: d.nationality || null,
    dob: d.dob || d.dateOfBirth || null,
    image_url: d.image_url || d.imageUrl || null,
  }))
}

export function normalizeTeams(raw, source = 'ergast') {
  if (source === 'ergast') {
    const list = raw?.MRData?.ConstructorTable?.Constructors || raw
    return list.map(t => ({
      name: t.name,
      nationality: t.nationality || null,
      base: null,
      logo_url: null,
    }))
  }
  return (Array.isArray(raw) ? raw : [raw]).map(t => ({
    name: t.name,
    nationality: t.nationality || null,
    base: t.base || null,
    logo_url: t.logo_url || t.logoUrl || null,
  }))
}

export function normalizeCircuits(raw, source = 'ergast') {
  if (source === 'ergast') {
    const list = raw?.MRData?.CircuitTable?.Circuits || raw
    return list.map(c => ({
      name: c.circuitName,
      location: c.Location?.locality || null,
      country: c.Location?.country || null,
      layout_image: null,
    }))
  }
  return (Array.isArray(raw) ? raw : [raw]).map(c => ({
    name: c.name || c.circuitName,
    location: c.location || c.locality || null,
    country: c.country || null,
    layout_image: c.layout_image || null,
  }))
}

export function normalizeRaces(raw, seasonId, circuitMap = {}, source = 'ergast') {
  if (source === 'ergast') {
    const list = raw?.MRData?.RaceTable?.Races || raw
    return list.map(r => ({
      season_id: seasonId,
      circuit_id: circuitMap[r.Circuit?.circuitName] || null,
      name: r.raceName,
      date: r.date || null,
      round: parseInt(r.round) || null,
    }))
  }
  return (Array.isArray(raw) ? raw : [raw]).map(r => ({
    season_id: seasonId,
    circuit_id: r.circuit_id || circuitMap[r.circuit] || null,
    name: r.name || r.raceName,
    date: r.date || null,
    round: parseInt(r.round) || null,
  }))
}

export function normalizeResults(raw, raceId, driverMap = {}, teamMap = {}, source = 'ergast') {
  if (source === 'ergast') {
    const races = raw?.MRData?.RaceTable?.Races || []
    const results = races[0]?.Results || raw
    return (Array.isArray(results) ? results : []).map(r => ({
      race_id: raceId,
      driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
      team_id: teamMap[r.Constructor?.name] || null,
      position: parseInt(r.position) || null,
      grid: parseInt(r.grid) || null,
      laps: parseInt(r.laps) || null,
      time: r.Time?.time || null,
      points: parseFloat(r.points) || 0,
      status: r.status || 'Finished',
    }))
  }
  return (Array.isArray(raw) ? raw : [raw]).map(r => ({
    race_id: raceId,
    driver_id: r.driver_id || driverMap[r.driver] || null,
    team_id: r.team_id || teamMap[r.team] || null,
    position: parseInt(r.position) || null,
    grid: parseInt(r.grid) || null,
    laps: parseInt(r.laps) || null,
    time: r.time || null,
    points: parseFloat(r.points) || 0,
    status: r.status || 'Finished',
  }))
}

export function normalizeQualifying(raw, raceId, driverMap = {}, teamMap = {}) {
  const races = raw?.MRData?.RaceTable?.Races || []
  const list = races[0]?.QualifyingResults || []
  return list.map(r => ({
    race_id: raceId,
    driver_id: driverMap[r.Driver?.code] || driverMap[`${r.Driver?.givenName} ${r.Driver?.familyName}`] || null,
    team_id: teamMap[r.Constructor?.name] || null,
    position: parseInt(r.position) || null,
    q1: r.Q1 || null,
    q2: r.Q2 || null,
    q3: r.Q3 || null,
  }))
}

export function normalizeDriverStandings(raw, seasonId, driverMap = {}, teamMap = {}) {
  const lists = raw?.MRData?.StandingsTable?.StandingsLists || []
  const standings = lists[0]?.DriverStandings || []
  return standings.map(s => ({
    season_id: seasonId,
    driver_id: driverMap[s.Driver?.code] || driverMap[`${s.Driver?.givenName} ${s.Driver?.familyName}`] || null,
    team_id: teamMap[s.Constructors?.[0]?.name] || null,
    points: parseFloat(s.points) || 0,
    position: parseInt(s.position) || null,
    wins: parseInt(s.wins) || 0,
  }))
}

export function normalizeConstructorStandings(raw, seasonId, teamMap = {}) {
  const lists = raw?.MRData?.StandingsTable?.StandingsLists || []
  const standings = lists[0]?.ConstructorStandings || []
  return standings.map(s => ({
    season_id: seasonId,
    team_id: teamMap[s.Constructor?.name] || null,
    points: parseFloat(s.points) || 0,
    position: parseInt(s.position) || null,
    wins: parseInt(s.wins) || 0,
  }))
}

export function normalizeLaps(raw, raceId, driverMap = {}) {
  return (Array.isArray(raw) ? raw : []).map(l => ({
    race_id: raceId,
    driver_id: l.driver_id || driverMap[l.driver] || null,
    lap_number: parseInt(l.lap_number || l.lap) || null,
    position: parseInt(l.position) || null,
    lap_time: l.lap_time || l.time || null,
  }))
}

export function normalizePitStops(raw, raceId, driverMap = {}) {
  return (Array.isArray(raw) ? raw : []).map(p => ({
    race_id: raceId,
    driver_id: p.driver_id || driverMap[p.driver] || null,
    lap: parseInt(p.lap) || null,
    duration: p.duration || null,
  }))
}

export function normalizeEvents(raw, raceId) {
  return (Array.isArray(raw) ? raw : []).map(e => ({
    race_id: raceId,
    lap: parseInt(e.lap) || null,
    type: e.type || 'safety_car',
    description: e.description || null,
  }))
}
