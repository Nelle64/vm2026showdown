UPDATE public.teams SET flag_emoji = CASE code
  WHEN 'MEX' THEN '🇲🇽' WHEN 'RSA' THEN '🇿🇦' WHEN 'KOR' THEN '🇰🇷' WHEN 'CZE' THEN '🇨🇿'
  WHEN 'CAN' THEN '🇨🇦' WHEN 'BIH' THEN '🇧🇦' WHEN 'USA' THEN '🇺🇸' WHEN 'PAR' THEN '🇵🇾'
  WHEN 'QAT' THEN '🇶🇦' WHEN 'SUI' THEN '🇨🇭' WHEN 'BRA' THEN '🇧🇷' WHEN 'MAR' THEN '🇲🇦'
  WHEN 'HAI' THEN '🇭🇹' WHEN 'SCO' THEN '🏴󠁧󠁢󠁳󠁣󠁴󠁿' WHEN 'AUS' THEN '🇦🇺' WHEN 'TUR' THEN '🇹🇷'
  WHEN 'GER' THEN '🇩🇪' WHEN 'CUW' THEN '🇨🇼' WHEN 'NED' THEN '🇳🇱' WHEN 'JPN' THEN '🇯🇵'
  WHEN 'CIV' THEN '🇨🇮' WHEN 'ECU' THEN '🇪🇨' WHEN 'SWE' THEN '🇸🇪' WHEN 'TUN' THEN '🇹🇳'
  WHEN 'ESP' THEN '🇪🇸' WHEN 'CPV' THEN '🇨🇻' WHEN 'BEL' THEN '🇧🇪' WHEN 'EGY' THEN '🇪🇬'
  WHEN 'KSA' THEN '🇸🇦' WHEN 'URY' THEN '🇺🇾' WHEN 'IRN' THEN '🇮🇷' WHEN 'NZL' THEN '🇳🇿'
  WHEN 'FRA' THEN '🇫🇷' WHEN 'SEN' THEN '🇸🇳' WHEN 'IRQ' THEN '🇮🇶' WHEN 'NOR' THEN '🇳🇴'
  WHEN 'ARG' THEN '🇦🇷' WHEN 'ALG' THEN '🇩🇿' WHEN 'AUT' THEN '🇦🇹' WHEN 'JOR' THEN '🇯🇴'
  WHEN 'POR' THEN '🇵🇹' WHEN 'COD' THEN '🇨🇩' WHEN 'ENG' THEN '🏴󠁧󠁢󠁥󠁮󠁧󠁿' WHEN 'CRO' THEN '🇭🇷'
  WHEN 'GHA' THEN '🇬🇭' WHEN 'PAN' THEN '🇵🇦' WHEN 'UZB' THEN '🇺🇿' WHEN 'COL' THEN '🇨🇴'
  WHEN 'ITA' THEN '🇮🇹' WHEN 'DEN' THEN '🇩🇰' WHEN 'POL' THEN '🇵🇱' WHEN 'UKR' THEN '🇺🇦'
  WHEN 'IRL' THEN '🇮🇪' WHEN 'CHI' THEN '🇨🇱' WHEN 'PER' THEN '🇵🇪' WHEN 'VEN' THEN '🇻🇪'
  WHEN 'CRC' THEN '🇨🇷' WHEN 'HON' THEN '🇭🇳' WHEN 'JAM' THEN '🇯🇲' WHEN 'NGA' THEN '🇳🇬'
  WHEN 'CMR' THEN '🇨🇲'
  ELSE flag_emoji
END
WHERE code IN ('MEX','RSA','KOR','CZE','CAN','BIH','USA','PAR','QAT','SUI','BRA','MAR','HAI','SCO','AUS','TUR','GER','CUW','NED','JPN','CIV','ECU','SWE','TUN','ESP','CPV','BEL','EGY','KSA','URY','IRN','NZL','FRA','SEN','IRQ','NOR','ARG','ALG','AUT','JOR','POR','COD','ENG','CRO','GHA','PAN','UZB','COL','ITA','DEN','POL','UKR','IRL','CHI','PER','VEN','CRC','HON','JAM','NGA','CMR');