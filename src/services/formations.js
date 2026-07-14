export const MIN_OUTFIELD_PLAYERS = 6;
export const MAX_LINEUP_PLAYERS = 7;

export function generateFormations() {
  const formations = [];

  for (let defenders = 2; defenders <= 4; defenders += 1) {
    for (let midfielders = 1; midfielders <= 3; midfielders += 1) {
      for (let forwards = 1; forwards <= 3; forwards += 1) {
        const outfield = defenders + midfielders + forwards;
        if (outfield !== MIN_OUTFIELD_PLAYERS) continue;
        formations.push(`${defenders}-${midfielders}-${forwards}`);
      }
    }
  }

  return formations.sort((a, b) => {
    const totalA = a.split("-").reduce((sum, part) => sum + Number(part), 1);
    const totalB = b.split("-").reduce((sum, part) => sum + Number(part), 1);
    return totalA - totalB || a.localeCompare(b);
  });
}

export function parseFormation(formation) {
  const match = String(formation || "").match(/^(\d+)-(\d+)-(\d+)$/);
  if (!match) return null;

  const parsed = {
    POR: 1,
    DEF: Number(match[1]),
    MED: Number(match[2]),
    DEL: Number(match[3])
  };

  if (!generateFormations().includes(`${parsed.DEF}-${parsed.MED}-${parsed.DEL}`)) {
    return null;
  }

  return parsed;
}

export function getFormationSlots(formation) {
  const parsed = parseFormation(formation);
  if (!parsed) return [];

  return [
    { key: "POR-1", position: "POR" },
    ...Array.from({ length: parsed.DEF }, (_, index) => ({ key: `DEF-${index + 1}`, position: "DEF" })),
    ...Array.from({ length: parsed.MED }, (_, index) => ({ key: `MED-${index + 1}`, position: "MED" })),
    ...Array.from({ length: parsed.DEL }, (_, index) => ({ key: `DEL-${index + 1}`, position: "DEL" }))
  ];
}

export function inferFormationFromPlayers(players) {
  const counts = players.reduce(
    (result, player) => {
      result[player.position] = (result[player.position] || 0) + 1;
      return result;
    },
    { POR: 0, DEF: 0, MED: 0, DEL: 0 }
  );

  const formation = `${counts.DEF}-${counts.MED}-${counts.DEL}`;
  return counts.POR === 1 && parseFormation(formation) ? formation : "2-2-2";
}

export function selectAutoLineup(players, budgetCap) {
  const grouped = { POR: [], DEF: [], MED: [], DEL: [] };
  for (const player of players.filter((item) => item.status === "available")) {
    grouped[player.position]?.push(player);
  }

  for (const list of Object.values(grouped)) {
    list.sort((a, b) => Number(b.form || 0) - Number(a.form || 0) || Number(b.marketValue || 0) - Number(a.marketValue || 0));
  }

  const formations = generateFormations().sort((a, b) => {
    const totalA = a.split("-").reduce((sum, part) => sum + Number(part), 1);
    const totalB = b.split("-").reduce((sum, part) => sum + Number(part), 1);
    return totalB - totalA || a.localeCompare(b);
  });

  for (const formation of formations) {
    const parsed = parseFormation(formation);
    const picked = [
      ...grouped.POR.slice(0, 1),
      ...grouped.DEF.slice(0, parsed.DEF),
      ...grouped.MED.slice(0, parsed.MED),
      ...grouped.DEL.slice(0, parsed.DEL)
    ];

    if (picked.length !== 1 + parsed.DEF + parsed.MED + parsed.DEL) continue;

    const budgetValue = picked.reduce((sum, player) => sum + Number(player.marketValue || 0), 0);
    if (budgetValue > budgetCap) continue;

    return { formation, players: picked.map((player) => player._id), budgetValue };
  }

  return { formation: "2-2-2", players: [], budgetValue: 0 };
}
