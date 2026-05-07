import { Category, DezenaFreq, AnalysisResult, Game, ParityStats } from '../types';

/**
 * Funções utilitárias para análise da Mega-Sena
 */

/**
 * Funções utilitárias para análise da Mega-Sena
 */

export const analyzeFrequenciy = (data: number[][], contests: number): AnalysisResult => {
  const recentData = data.slice(-contests).flat();
  const counter: Record<number, number> = {};
  
  // Inicializa todos de 1 a 60
  for (let i = 1; i <= 60; i++) counter[i] = 0;
  
  // Conta frequências
  recentData.forEach(num => {
    if (num >= 1 && num <= 60) {
      counter[num] = (counter[num] || 0) + 1;
    }
  });

  const freqs: DezenaFreq[] = Object.entries(counter).map(([dez, freq]) => ({
    dezena: parseInt(dez),
    frequencia: freq
  }));

  // Agrupar dezenas por frequência (maior para menor)
  const freqGroups: Record<number, number[]> = {};
  freqs.forEach(f => {
    if (!freqGroups[f.frequencia]) freqGroups[f.frequencia] = [];
    freqGroups[f.frequencia].push(f.dezena);
  });

  const sortedUniqueFreqs = Object.keys(freqGroups)
    .map(Number)
    .sort((a, b) => b - a);

  const result: AnalysisResult = {
    quentissimas: [],
    quentes: [],
    mornas: [],
    frias: [],
    geladas: []
  };

  if (sortedUniqueFreqs.length === 0) return result;

  // Lógica Python para categorias baseada na quantidade de níveis de frequência
  let freqs_quentissimas: number[] = [];
  let freqs_quentes: number[] = [];
  let freqs_mornas: number[] = [];
  let freqs_frias: number[] = [];
  let freqs_geladas: number[] = [];

  if (sortedUniqueFreqs.length >= 5) {
    const num_freq = sortedUniqueFreqs.length;
    const tamanho = num_freq / 5;
    
    // Alinhado com int(tamanho * X) do Python
    const idx1 = Math.max(1, Math.floor(tamanho * 1));
    const idx2 = Math.max(2, Math.floor(tamanho * 2));
    const idx3 = Math.max(3, Math.floor(tamanho * 3));
    const idx4 = Math.max(4, Math.floor(tamanho * 4));
    
    freqs_quentissimas = sortedUniqueFreqs.slice(0, idx1);
    freqs_quentes = sortedUniqueFreqs.slice(idx1, idx2);
    freqs_mornas = sortedUniqueFreqs.slice(idx2, idx3);
    freqs_frias = sortedUniqueFreqs.slice(idx3, idx4);
    freqs_geladas = sortedUniqueFreqs.slice(idx4);
  } else if (sortedUniqueFreqs.length === 4) {
    freqs_quentissimas = [sortedUniqueFreqs[0]];
    freqs_quentes = [sortedUniqueFreqs[1]];
    freqs_mornas = [sortedUniqueFreqs[2]];
    freqs_geladas = [sortedUniqueFreqs[3]];
  } else if (sortedUniqueFreqs.length === 3) {
    freqs_quentissimas = [sortedUniqueFreqs[0]];
    freqs_mornas = [sortedUniqueFreqs[1]];
    freqs_geladas = [sortedUniqueFreqs[2]];
  } else if (sortedUniqueFreqs.length === 2) {
    freqs_quentissimas = [sortedUniqueFreqs[0]];
    freqs_geladas = [sortedUniqueFreqs[1]];
  } else {
    // Apenas 1 nível de freq: Tudo Morna
    freqs_mornas = sortedUniqueFreqs;
  }

  const mapToCat = (freqList: number[], cat: keyof AnalysisResult) => {
    freqList.forEach(freq => {
      freqGroups[freq].forEach(dez => {
        result[cat].push({ dezena: dez, frequencia: freq });
      });
    });
  };

  mapToCat(freqs_quentissimas, 'quentissimas');
  mapToCat(freqs_quentes, 'quentes');
  mapToCat(freqs_mornas, 'mornas');
  mapToCat(freqs_frias, 'frias');
  mapToCat(freqs_geladas, 'geladas');

  // Ordena dezenas dentro de cada categoria
  (Object.keys(result) as (keyof AnalysisResult)[]).forEach(key => {
    result[key].sort((a, b) => a.dezena - b.dezena);
  });

  return result;
};

export const calculateParityStats = (result: AnalysisResult): ParityStats[] => {
  const categories: { name: string; data: DezenaFreq[] }[] = [
    { name: 'Quentíssimas', data: result.quentissimas },
    { name: 'Quentes', data: result.quentes },
    { name: 'Mornas', data: result.mornas },
    { name: 'Frias', data: result.frias },
    { name: 'Geladas', data: result.geladas }
  ];

  const stats = categories.map(cat => {
    const total = cat.data.length;
    const evens = cat.data.filter(d => d.dezena % 2 === 0).length;
    const odds = total - evens;
    return {
      segment: cat.name,
      total,
      evens,
      odds,
      evensPercent: total > 0 ? (evens / total) * 100 : 0,
      oddsPercent: total > 0 ? (odds / total) * 100 : 0
    };
  });

  const totalAll = stats.reduce((acc, s) => acc + s.total, 0);
  const totalEvens = stats.reduce((acc, s) => acc + s.evens, 0);
  const totalOdds = stats.reduce((acc, s) => acc + s.odds, 0);

  stats.push({
    segment: 'TOTAL',
    total: totalAll,
    evens: totalEvens,
    odds: totalOdds,
    evensPercent: totalAll > 0 ? (totalEvens / totalAll) * 100 : 0,
    oddsPercent: totalAll > 0 ? (totalOdds / totalAll) * 100 : 0
  });

  return stats;
};

export const generateGames = (
  analysis: AnalysisResult,
  config: {
    n_jogos: number;
    gameSize: number;
    qt: number;
    q: number;
    m: number;
    f: number;
    g: number;
    minEvens: number;
    maxEvens: number; // For Mega-Sena, often we just use one value or range
    history: number[][];
  }
): Game[] => {
  const { n_jogos, gameSize, qt, q, m, f, g, minEvens, maxEvens, history } = config;
  const games: Game[] = [];
  const historySet = new Set(history.map(row => [...row].sort((a, b) => a - b).join(',')));
  
  let attempts = 0;
  const maxAttempts = 30000;

  const sampleFromCat = (categories: DezenaFreq[], n: number) => {
    if (n === 0) return [];
    
    // Agrupar por frequência dentro da categoria (como no Python)
    const groups: Record<number, number[]> = {};
    categories.forEach(d => {
      if (!groups[d.frequencia]) groups[d.frequencia] = [];
      groups[d.frequencia].push(d.dezena);
    });
    
    const sortedFreqs = Object.keys(groups).map(Number).sort((a, b) => b - a);
    const pool: number[] = [];
    
    // O Python usa random.sample(pool[:max(qt*3, len(pool))], qt)
    // Vamos coletar as dezenas disponíveis respeitando a prioridade de frequência
    for (const freq of sortedFreqs) {
      pool.push(...groups[freq]);
      if (pool.length >= n) break;
    }

    // Amostra pool limitado (top 3x a quantidade pedida para variar)
    const limit = Math.max(n * 3, Math.min(pool.length, 15));
    const subPool = pool.slice(0, limit);
    
    const shuffled = [...subPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  while (games.length < n_jogos && attempts < maxAttempts) {
    attempts++;
    
    const currentBallsSet = new Set<number>();
    
    // Adicionar de cada categoria garantindo unicidade
    const qtBalls = sampleFromCat(analysis.quentissimas, qt);
    qtBalls.forEach(b => currentBallsSet.add(b));
    
    const qBalls = sampleFromCat(analysis.quentes, q);
    qBalls.forEach(b => currentBallsSet.add(b));
    
    const mBalls = sampleFromCat(analysis.mornas, m);
    mBalls.forEach(b => currentBallsSet.add(b));
    
    const fBalls = sampleFromCat(analysis.frias, f);
    fBalls.forEach(b => currentBallsSet.add(b));
    
    const gBalls = sampleFromCat(analysis.geladas, g);
    gBalls.forEach(b => currentBallsSet.add(b));

    if (currentBallsSet.size !== gameSize) continue;

    const gameArray = Array.from(currentBallsSet).sort((a, b) => a - b);
    const evens = gameArray.filter(n => n % 2 === 0).length;
    
    // Balanceamento Par/Ímpar (Usamos minEvens como o valor fixo desejado se minEvens == maxEvens)
    if (evens < minEvens || evens > maxEvens) continue;

    const gameStr = gameArray.join(',');
    if (!games.some(g => g.balls.join(',') === gameStr)) {
      games.push({
        balls: gameArray,
        evens,
        odds: gameSize - evens,
        isNew: !historySet.has(gameStr)
      });
    }
  }

  return games;
};
