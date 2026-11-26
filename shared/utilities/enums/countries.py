from enum import Enum
from dataclasses import dataclass


class Continent(Enum):
    AFRICA = 'Africa'
    ASIA = 'Asia'
    EUROPE = 'Europe'
    NORTH_AMERICA = 'North America'
    SOUTH_AMERICA = 'South America'
    OCEANIA = 'Oceania'


@dataclass
class Country:
    code: str
    code_alpha3: str
    name: str
    continent: str
    dial_code: str
    flag_emoji: str

    def to_tuple(self):
        return (self.code, self.code_alpha3, self.name, self.continent, self.dial_code, self.flag_emoji)


class CountriesRegistry:
    """Central registry for all countries/regions used in geo-blocking."""

    # ──────────────────────────────────────────────
    # Africa (54 countries)
    # ──────────────────────────────────────────────
    _AFRICA = [
        Country('DZ', 'DZA', 'Algeria', 'Africa', '+213', '🇩🇿'),
        Country('AO', 'AGO', 'Angola', 'Africa', '+244', '🇦🇴'),
        Country('BJ', 'BEN', 'Benin', 'Africa', '+229', '🇧🇯'),
        Country('BW', 'BWA', 'Botswana', 'Africa', '+267', '🇧🇼'),
        Country('BF', 'BFA', 'Burkina Faso', 'Africa', '+226', '🇧🇫'),
        Country('BI', 'BDI', 'Burundi', 'Africa', '+257', '🇧🇮'),
        Country('CV', 'CPV', 'Cabo Verde', 'Africa', '+238', '🇨🇻'),
        Country('CM', 'CMR', 'Cameroon', 'Africa', '+237', '🇨🇲'),
        Country('CF', 'CAF', 'Central African Republic', 'Africa', '+236', '🇨🇫'),
        Country('TD', 'TCD', 'Chad', 'Africa', '+235', '🇹🇩'),
        Country('KM', 'COM', 'Comoros', 'Africa', '+269', '🇰🇲'),
        Country('CG', 'COG', 'Congo', 'Africa', '+242', '🇨🇬'),
        Country('CD', 'COD', 'Congo (DRC)', 'Africa', '+243', '🇨🇩'),
        Country('CI', 'CIV', "Côte d'Ivoire", 'Africa', '+225', '🇨🇮'),
        Country('DJ', 'DJI', 'Djibouti', 'Africa', '+253', '🇩🇯'),
        Country('EG', 'EGY', 'Egypt', 'Africa', '+20', '🇪🇬'),
        Country('GQ', 'GNQ', 'Equatorial Guinea', 'Africa', '+240', '🇬🇶'),
        Country('ER', 'ERI', 'Eritrea', 'Africa', '+291', '🇪🇷'),
        Country('SZ', 'SWZ', 'Eswatini', 'Africa', '+268', '🇸🇿'),
        Country('ET', 'ETH', 'Ethiopia', 'Africa', '+251', '🇪🇹'),
        Country('GA', 'GAB', 'Gabon', 'Africa', '+241', '🇬🇦'),
        Country('GM', 'GMB', 'Gambia', 'Africa', '+220', '🇬🇲'),
        Country('GH', 'GHA', 'Ghana', 'Africa', '+233', '🇬🇭'),
        Country('GN', 'GIN', 'Guinea', 'Africa', '+224', '🇬🇳'),
        Country('GW', 'GNB', 'Guinea-Bissau', 'Africa', '+245', '🇬🇼'),
        Country('KE', 'KEN', 'Kenya', 'Africa', '+254', '🇰🇪'),
        Country('LS', 'LSO', 'Lesotho', 'Africa', '+266', '🇱🇸'),
        Country('LR', 'LBR', 'Liberia', 'Africa', '+231', '🇱🇷'),
        Country('LY', 'LBY', 'Libya', 'Africa', '+218', '🇱🇾'),
        Country('MG', 'MDG', 'Madagascar', 'Africa', '+261', '🇲🇬'),
        Country('MW', 'MWI', 'Malawi', 'Africa', '+265', '🇲🇼'),
        Country('ML', 'MLI', 'Mali', 'Africa', '+223', '🇲🇱'),
        Country('MR', 'MRT', 'Mauritania', 'Africa', '+222', '🇲🇷'),
        Country('MU', 'MUS', 'Mauritius', 'Africa', '+230', '🇲🇺'),
        Country('MA', 'MAR', 'Morocco', 'Africa', '+212', '🇲🇦'),
        Country('MZ', 'MOZ', 'Mozambique', 'Africa', '+258', '🇲🇿'),
        Country('NA', 'NAM', 'Namibia', 'Africa', '+264', '🇳🇦'),
        Country('NE', 'NER', 'Niger', 'Africa', '+227', '🇳🇪'),
        Country('NG', 'NGA', 'Nigeria', 'Africa', '+234', '🇳🇬'),
        Country('RW', 'RWA', 'Rwanda', 'Africa', '+250', '🇷🇼'),
        Country('ST', 'STP', 'São Tomé and Príncipe', 'Africa', '+239', '🇸🇹'),
        Country('SN', 'SEN', 'Senegal', 'Africa', '+221', '🇸🇳'),
        Country('SC', 'SYC', 'Seychelles', 'Africa', '+248', '🇸🇨'),
        Country('SL', 'SLE', 'Sierra Leone', 'Africa', '+232', '🇸🇱'),
        Country('SO', 'SOM', 'Somalia', 'Africa', '+252', '🇸🇴'),
        Country('ZA', 'ZAF', 'South Africa', 'Africa', '+27', '🇿🇦'),
        Country('SS', 'SSD', 'South Sudan', 'Africa', '+211', '🇸🇸'),
        Country('SD', 'SDN', 'Sudan', 'Africa', '+249', '🇸🇩'),
        Country('TZ', 'TZA', 'Tanzania', 'Africa', '+255', '🇹🇿'),
        Country('TG', 'TGO', 'Togo', 'Africa', '+228', '🇹🇬'),
        Country('TN', 'TUN', 'Tunisia', 'Africa', '+216', '🇹🇳'),
        Country('UG', 'UGA', 'Uganda', 'Africa', '+256', '🇺🇬'),
        Country('ZM', 'ZMB', 'Zambia', 'Africa', '+260', '🇿🇲'),
        Country('ZW', 'ZWE', 'Zimbabwe', 'Africa', '+263', '🇿🇼'),
    ]

    # ──────────────────────────────────────────────
    # Asia (49 countries)
    # ──────────────────────────────────────────────
    _ASIA = [
        Country('AF', 'AFG', 'Afghanistan', 'Asia', '+93', '🇦🇫'),
        Country('AM', 'ARM', 'Armenia', 'Asia', '+374', '🇦🇲'),
        Country('AZ', 'AZE', 'Azerbaijan', 'Asia', '+994', '🇦🇿'),
        Country('BH', 'BHR', 'Bahrain', 'Asia', '+973', '🇧🇭'),
        Country('BD', 'BGD', 'Bangladesh', 'Asia', '+880', '🇧🇩'),
        Country('BT', 'BTN', 'Bhutan', 'Asia', '+975', '🇧🇹'),
        Country('BN', 'BRN', 'Brunei', 'Asia', '+673', '🇧🇳'),
        Country('KH', 'KHM', 'Cambodia', 'Asia', '+855', '🇰🇭'),
        Country('CN', 'CHN', 'China', 'Asia', '+86', '🇨🇳'),
        Country('CY', 'CYP', 'Cyprus', 'Asia', '+357', '🇨🇾'),
        Country('GE', 'GEO', 'Georgia', 'Asia', '+995', '🇬🇪'),
        Country('IN', 'IND', 'India', 'Asia', '+91', '🇮🇳'),
        Country('ID', 'IDN', 'Indonesia', 'Asia', '+62', '🇮🇩'),
        Country('IR', 'IRN', 'Iran', 'Asia', '+98', '🇮🇷'),
        Country('IQ', 'IRQ', 'Iraq', 'Asia', '+964', '🇮🇶'),
        Country('IL', 'ISR', 'Israel', 'Asia', '+972', '🇮🇱'),
        Country('JP', 'JPN', 'Japan', 'Asia', '+81', '🇯🇵'),
        Country('JO', 'JOR', 'Jordan', 'Asia', '+962', '🇯🇴'),
        Country('KZ', 'KAZ', 'Kazakhstan', 'Asia', '+7', '🇰🇿'),
        Country('KW', 'KWT', 'Kuwait', 'Asia', '+965', '🇰🇼'),
        Country('KG', 'KGZ', 'Kyrgyzstan', 'Asia', '+996', '🇰🇬'),
        Country('LA', 'LAO', 'Laos', 'Asia', '+856', '🇱🇦'),
        Country('LB', 'LBN', 'Lebanon', 'Asia', '+961', '🇱🇧'),
        Country('MY', 'MYS', 'Malaysia', 'Asia', '+60', '🇲🇾'),
        Country('MV', 'MDV', 'Maldives', 'Asia', '+960', '🇲🇻'),
        Country('MN', 'MNG', 'Mongolia', 'Asia', '+976', '🇲🇳'),
        Country('MM', 'MMR', 'Myanmar', 'Asia', '+95', '🇲🇲'),
        Country('NP', 'NPL', 'Nepal', 'Asia', '+977', '🇳🇵'),
        Country('KP', 'PRK', 'North Korea', 'Asia', '+850', '🇰🇵'),
        Country('OM', 'OMN', 'Oman', 'Asia', '+968', '🇴🇲'),
        Country('PK', 'PAK', 'Pakistan', 'Asia', '+92', '🇵🇰'),
        Country('PS', 'PSE', 'Palestine', 'Asia', '+970', '🇵🇸'),
        Country('PH', 'PHL', 'Philippines', 'Asia', '+63', '🇵🇭'),
        Country('QA', 'QAT', 'Qatar', 'Asia', '+974', '🇶🇦'),
        Country('SA', 'SAU', 'Saudi Arabia', 'Asia', '+966', '🇸🇦'),
        Country('SG', 'SGP', 'Singapore', 'Asia', '+65', '🇸🇬'),
        Country('KR', 'KOR', 'South Korea', 'Asia', '+82', '🇰🇷'),
        Country('LK', 'LKA', 'Sri Lanka', 'Asia', '+94', '🇱🇰'),
        Country('SY', 'SYR', 'Syria', 'Asia', '+963', '🇸🇾'),
        Country('TW', 'TWN', 'Taiwan', 'Asia', '+886', '🇹🇼'),
        Country('TJ', 'TJK', 'Tajikistan', 'Asia', '+992', '🇹🇯'),
        Country('TH', 'THA', 'Thailand', 'Asia', '+66', '🇹🇭'),
        Country('TL', 'TLS', 'Timor-Leste', 'Asia', '+670', '🇹🇱'),
        Country('TR', 'TUR', 'Turkey', 'Asia', '+90', '🇹🇷'),
        Country('TM', 'TKM', 'Turkmenistan', 'Asia', '+993', '🇹🇲'),
        Country('AE', 'ARE', 'United Arab Emirates', 'Asia', '+971', '🇦🇪'),
        Country('UZ', 'UZB', 'Uzbekistan', 'Asia', '+998', '🇺🇿'),
        Country('VN', 'VNM', 'Vietnam', 'Asia', '+84', '🇻🇳'),
        Country('YE', 'YEM', 'Yemen', 'Asia', '+967', '🇾🇪'),
    ]

    # ──────────────────────────────────────────────
    # Europe (45 countries)
    # ──────────────────────────────────────────────
    _EUROPE = [
        Country('AL', 'ALB', 'Albania', 'Europe', '+355', '🇦🇱'),
        Country('AD', 'AND', 'Andorra', 'Europe', '+376', '🇦🇩'),
        Country('AT', 'AUT', 'Austria', 'Europe', '+43', '🇦🇹'),
        Country('BY', 'BLR', 'Belarus', 'Europe', '+375', '🇧🇾'),
        Country('BE', 'BEL', 'Belgium', 'Europe', '+32', '🇧🇪'),
        Country('BA', 'BIH', 'Bosnia and Herzegovina', 'Europe', '+387', '🇧🇦'),
        Country('BG', 'BGR', 'Bulgaria', 'Europe', '+359', '🇧🇬'),
        Country('HR', 'HRV', 'Croatia', 'Europe', '+385', '🇭🇷'),
        Country('CZ', 'CZE', 'Czech Republic', 'Europe', '+420', '🇨🇿'),
        Country('DK', 'DNK', 'Denmark', 'Europe', '+45', '🇩🇰'),
        Country('EE', 'EST', 'Estonia', 'Europe', '+372', '🇪🇪'),
        Country('FI', 'FIN', 'Finland', 'Europe', '+358', '🇫🇮'),
        Country('FR', 'FRA', 'France', 'Europe', '+33', '🇫🇷'),
        Country('DE', 'DEU', 'Germany', 'Europe', '+49', '🇩🇪'),
        Country('GR', 'GRC', 'Greece', 'Europe', '+30', '🇬🇷'),
        Country('HU', 'HUN', 'Hungary', 'Europe', '+36', '🇭🇺'),
        Country('IS', 'ISL', 'Iceland', 'Europe', '+354', '🇮🇸'),
        Country('IE', 'IRL', 'Ireland', 'Europe', '+353', '🇮🇪'),
        Country('IT', 'ITA', 'Italy', 'Europe', '+39', '🇮🇹'),
        Country('XK', 'XKX', 'Kosovo', 'Europe', '+383', '🇽🇰'),
        Country('LV', 'LVA', 'Latvia', 'Europe', '+371', '🇱🇻'),
        Country('LI', 'LIE', 'Liechtenstein', 'Europe', '+423', '🇱🇮'),
        Country('LT', 'LTU', 'Lithuania', 'Europe', '+370', '🇱🇹'),
        Country('LU', 'LUX', 'Luxembourg', 'Europe', '+352', '🇱🇺'),
        Country('MT', 'MLT', 'Malta', 'Europe', '+356', '🇲🇹'),
        Country('MD', 'MDA', 'Moldova', 'Europe', '+373', '🇲🇩'),
        Country('MC', 'MCO', 'Monaco', 'Europe', '+377', '🇲🇨'),
        Country('ME', 'MNE', 'Montenegro', 'Europe', '+382', '🇲🇪'),
        Country('NL', 'NLD', 'Netherlands', 'Europe', '+31', '🇳🇱'),
        Country('MK', 'MKD', 'North Macedonia', 'Europe', '+389', '🇲🇰'),
        Country('NO', 'NOR', 'Norway', 'Europe', '+47', '🇳🇴'),
        Country('PL', 'POL', 'Poland', 'Europe', '+48', '🇵🇱'),
        Country('PT', 'PRT', 'Portugal', 'Europe', '+351', '🇵🇹'),
        Country('RO', 'ROU', 'Romania', 'Europe', '+40', '🇷🇴'),
        Country('RU', 'RUS', 'Russia', 'Europe', '+7', '🇷🇺'),
        Country('SM', 'SMR', 'San Marino', 'Europe', '+378', '🇸🇲'),
        Country('RS', 'SRB', 'Serbia', 'Europe', '+381', '🇷🇸'),
        Country('SK', 'SVK', 'Slovakia', 'Europe', '+421', '🇸🇰'),
        Country('SI', 'SVN', 'Slovenia', 'Europe', '+386', '🇸🇮'),
        Country('ES', 'ESP', 'Spain', 'Europe', '+34', '🇪🇸'),
        Country('SE', 'SWE', 'Sweden', 'Europe', '+46', '🇸🇪'),
        Country('CH', 'CHE', 'Switzerland', 'Europe', '+41', '🇨🇭'),
        Country('UA', 'UKR', 'Ukraine', 'Europe', '+380', '🇺🇦'),
        Country('GB', 'GBR', 'United Kingdom', 'Europe', '+44', '🇬🇧'),
        Country('VA', 'VAT', 'Vatican City', 'Europe', '+39', '🇻🇦'),
    ]

    # ──────────────────────────────────────────────
    # North America (23 countries)
    # ──────────────────────────────────────────────
    _NORTH_AMERICA = [
        Country('AG', 'ATG', 'Antigua and Barbuda', 'North America', '+1-268', '🇦🇬'),
        Country('BS', 'BHS', 'Bahamas', 'North America', '+1-242', '🇧🇸'),
        Country('BB', 'BRB', 'Barbados', 'North America', '+1-246', '🇧🇧'),
        Country('BZ', 'BLZ', 'Belize', 'North America', '+501', '🇧🇿'),
        Country('CA', 'CAN', 'Canada', 'North America', '+1', '🇨🇦'),
        Country('CR', 'CRI', 'Costa Rica', 'North America', '+506', '🇨🇷'),
        Country('CU', 'CUB', 'Cuba', 'North America', '+53', '🇨🇺'),
        Country('DM', 'DMA', 'Dominica', 'North America', '+1-767', '🇩🇲'),
        Country('DO', 'DOM', 'Dominican Republic', 'North America', '+1-809', '🇩🇴'),
        Country('SV', 'SLV', 'El Salvador', 'North America', '+503', '🇸🇻'),
        Country('GD', 'GRD', 'Grenada', 'North America', '+1-473', '🇬🇩'),
        Country('GT', 'GTM', 'Guatemala', 'North America', '+502', '🇬🇹'),
        Country('HT', 'HTI', 'Haiti', 'North America', '+509', '🇭🇹'),
        Country('HN', 'HND', 'Honduras', 'North America', '+504', '🇭🇳'),
        Country('JM', 'JAM', 'Jamaica', 'North America', '+1-876', '🇯🇲'),
        Country('MX', 'MEX', 'Mexico', 'North America', '+52', '🇲🇽'),
        Country('NI', 'NIC', 'Nicaragua', 'North America', '+505', '🇳🇮'),
        Country('PA', 'PAN', 'Panama', 'North America', '+507', '🇵🇦'),
        Country('KN', 'KNA', 'Saint Kitts and Nevis', 'North America', '+1-869', '🇰🇳'),
        Country('LC', 'LCA', 'Saint Lucia', 'North America', '+1-758', '🇱🇨'),
        Country('VC', 'VCT', 'Saint Vincent and the Grenadines', 'North America', '+1-784', '🇻🇨'),
        Country('TT', 'TTO', 'Trinidad and Tobago', 'North America', '+1-868', '🇹🇹'),
        Country('US', 'USA', 'United States', 'North America', '+1', '🇺🇸'),
    ]

    # ──────────────────────────────────────────────
    # South America (12 countries)
    # ──────────────────────────────────────────────
    _SOUTH_AMERICA = [
        Country('AR', 'ARG', 'Argentina', 'South America', '+54', '🇦🇷'),
        Country('BO', 'BOL', 'Bolivia', 'South America', '+591', '🇧🇴'),
        Country('BR', 'BRA', 'Brazil', 'South America', '+55', '🇧🇷'),
        Country('CL', 'CHL', 'Chile', 'South America', '+56', '🇨🇱'),
        Country('CO', 'COL', 'Colombia', 'South America', '+57', '🇨🇴'),
        Country('EC', 'ECU', 'Ecuador', 'South America', '+593', '🇪🇨'),
        Country('GY', 'GUY', 'Guyana', 'South America', '+592', '🇬🇾'),
        Country('PY', 'PRY', 'Paraguay', 'South America', '+595', '🇵🇾'),
        Country('PE', 'PER', 'Peru', 'South America', '+51', '🇵🇪'),
        Country('SR', 'SUR', 'Suriname', 'South America', '+597', '🇸🇷'),
        Country('UY', 'URY', 'Uruguay', 'South America', '+598', '🇺🇾'),
        Country('VE', 'VEN', 'Venezuela', 'South America', '+58', '🇻🇪'),
    ]

    # ──────────────────────────────────────────────
    # Oceania (14 countries)
    # ──────────────────────────────────────────────
    _OCEANIA = [
        Country('AU', 'AUS', 'Australia', 'Oceania', '+61', '🇦🇺'),
        Country('FJ', 'FJI', 'Fiji', 'Oceania', '+679', '🇫🇯'),
        Country('KI', 'KIR', 'Kiribati', 'Oceania', '+686', '🇰🇮'),
        Country('MH', 'MHL', 'Marshall Islands', 'Oceania', '+692', '🇲🇭'),
        Country('FM', 'FSM', 'Micronesia', 'Oceania', '+691', '🇫🇲'),
        Country('NR', 'NRU', 'Nauru', 'Oceania', '+674', '🇳🇷'),
        Country('NZ', 'NZL', 'New Zealand', 'Oceania', '+64', '🇳🇿'),
        Country('PW', 'PLW', 'Palau', 'Oceania', '+680', '🇵🇼'),
        Country('PG', 'PNG', 'Papua New Guinea', 'Oceania', '+675', '🇵🇬'),
        Country('WS', 'WSM', 'Samoa', 'Oceania', '+685', '🇼🇸'),
        Country('SB', 'SLB', 'Solomon Islands', 'Oceania', '+677', '🇸🇧'),
        Country('TO', 'TON', 'Tonga', 'Oceania', '+676', '🇹🇴'),
        Country('TV', 'TUV', 'Tuvalu', 'Oceania', '+688', '🇹🇻'),
        Country('VU', 'VUT', 'Vanuatu', 'Oceania', '+678', '🇻🇺'),
    ]

    @classmethod
    def get_all_countries(cls):
        """Return all countries as a list of tuples (code, code_alpha3, name, continent, dial_code, flag_emoji)."""
        all_countries = (
            cls._AFRICA + cls._ASIA + cls._EUROPE +
            cls._NORTH_AMERICA + cls._SOUTH_AMERICA + cls._OCEANIA
        )
        return [c.to_tuple() for c in all_countries]

    @classmethod
    def get_by_continent(cls, continent):
        """Return countries for a specific continent as tuples."""
        continent_map = {
            Continent.AFRICA: cls._AFRICA,
            Continent.ASIA: cls._ASIA,
            Continent.EUROPE: cls._EUROPE,
            Continent.NORTH_AMERICA: cls._NORTH_AMERICA,
            Continent.SOUTH_AMERICA: cls._SOUTH_AMERICA,
            Continent.OCEANIA: cls._OCEANIA,
        }
        countries = continent_map.get(continent, [])
        return [c.to_tuple() for c in countries]

    @classmethod
    def get_by_code(cls, code):
        """Return a single country by ISO alpha-2 code."""
        for c in cls._AFRICA + cls._ASIA + cls._EUROPE + cls._NORTH_AMERICA + cls._SOUTH_AMERICA + cls._OCEANIA:
            if c.code == code:
                return c
        return None

    @classmethod
    def get_africa(cls):
        return [c.to_tuple() for c in cls._AFRICA]

    @classmethod
    def get_asia(cls):
        return [c.to_tuple() for c in cls._ASIA]

    @classmethod
    def get_europe(cls):
        return [c.to_tuple() for c in cls._EUROPE]

    @classmethod
    def get_north_america(cls):
        return [c.to_tuple() for c in cls._NORTH_AMERICA]

    @classmethod
    def get_south_america(cls):
        return [c.to_tuple() for c in cls._SOUTH_AMERICA]

    @classmethod
    def get_oceania(cls):
        return [c.to_tuple() for c in cls._OCEANIA]
