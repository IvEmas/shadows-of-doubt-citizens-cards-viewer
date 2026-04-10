'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import { CitizenCard } from '@/components/CitizenCard';
import { FieldToggles } from '@/components/FieldToggles';
import { AdvancedFilterField, AdvancedFilterItem, CitizenFilters, CitizensPayload, SearchMode, VisibilitySettings } from '@/lib/types';
import { buildFilterOptions, filterCitizens } from '@/lib/utils';

const DEFAULT_VISIBILITY: VisibilitySettings = {
  showHome: true,
  showWork: true,
  showRelations: true,
  showSecurity: false,
  showExtra: false,
};

const DEFAULT_FILTERS: CitizenFilters = {
  query: '',
  searchMode: 'all',
  gender: '',
  heightCategory: '',
  exactHeight: '',
  exactWeight: '',
  advanced: [],
  sortBy: 'id',
};

const VISIBILITY_STORAGE_KEY = 'citizens-visibility';

type Props = {
  data: CitizensPayload;
};

const SEARCH_MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'all', label: 'All fields' },
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'position', label: 'Position' },
  { value: 'home', label: 'Home' },
  { value: 'relations', label: 'Relations' },
  { value: 'password', label: 'Password' },
];

const ADVANCED_OPTIONS: Array<{ value: AdvancedFilterField; label: string }> = [
  { value: 'company', label: 'Company' },
  { value: 'home', label: 'Home' },
  { value: 'relations', label: 'Relations' },
  { value: 'password', label: 'Password' },
  { value: 'hair', label: 'Hair' },
  { value: 'eye', label: 'Eye' },
  { value: 'blood', label: 'Blood' },
];

export function CitizensExplorer({ data: initialData }: Props) {
  const [data, setData] = useState<CitizensPayload>(initialData);
  const [filters, setFilters] = useState<CitizenFilters>(DEFAULT_FILTERS);
  const [visibility, setVisibility] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [uploadState, setUploadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as VisibilitySettings;
      setVisibility({ ...DEFAULT_VISIBILITY, ...parsed });
    } catch {
      // ignore broken storage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const filterOptions = useMemo(() => buildFilterOptions(data.citizens), [data.citizens]);
  const filteredCitizens = useMemo(() => filterCitizens(data.citizens, filters), [data.citizens, filters]);
  const availableAdvancedFields = useMemo(
    () => ADVANCED_OPTIONS.filter((option) => !filters.advanced.some((item) => item.field === option.value)),
    [filters.advanced],
  );

  const hasData = data.citizens.length > 0;
  const shouldShowPopulation = data.meta.population > 0;
  const shouldShowCards = data.meta.citizens_count > 0 && data.meta.citizens_count !== data.meta.population;

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadState('loading');
    setUploadMessage('Загружаю и парсю файл...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-city', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось обработать файл.');
      }

      setData(payload as CitizensPayload);
      setUploadState('idle');
      setUploadMessage(`Файл загружен: ${file.name}`);
      setFilters(DEFAULT_FILTERS);
    } catch (error) {
      setUploadState('error');
      setUploadMessage(error instanceof Error ? error.message : 'Ошибка загрузки файла.');
    } finally {
      event.target.value = '';
    }
  }

  function updateFilter<Key extends keyof CitizenFilters>(key: Key, value: CitizenFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function addAdvancedFilter() {
    const nextField = availableAdvancedFields[0]?.value;
    if (!nextField) {
      return;
    }

    setFilters((current) => ({
      ...current,
      advanced: [...current.advanced, { id: `f-${Date.now()}-${current.advanced.length}`, field: nextField, value: '' }],
    }));
  }

  function updateAdvancedFilter(id: string, patch: Partial<AdvancedFilterItem>) {
    setFilters((current) => ({
      ...current,
      advanced: current.advanced.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeAdvancedFilter(id: string) {
    setFilters((current) => ({
      ...current,
      advanced: current.advanced.filter((item) => item.id !== id),
    }));
  }

  return (
    <div className="pageShell compactLayout">
      <aside className="sidebar">
        <div className="heroCard">
          <div className="heroTopRow">
            <div className="badgeRow heroBadgeRow">
              <span className="badge">{hasData ? data.meta.city_name : 'Waiting for file'}</span>
              {data.meta.seed ? <span className="badge muted heroSeedBadge">seed {data.meta.seed}</span> : null}
              {data.meta.build ? <span className="badge muted">build {data.meta.build}</span> : null}
            </div>
          </div>

          <div className="heroRightMeta">
            {shouldShowPopulation ? <span className="badge subtle heroStatBadge">Population: {data.meta.population}</span> : null}
            {shouldShowCards ? <span className="badge subtle heroStatBadge">Cards: {data.meta.citizens_count}</span> : null}
          </div>

          <h1>Citizens explorer</h1>
          <p>{hasData ? 'Компактные карточки граждан, точный поиск по полю и комбинируемые фильтры.' : 'Старт пустой. Загрузи .citb, .cit или .json через Load city file.'}</p>
        </div>

        <div className="toolbarCard">
          <div className="toolbarHeader toolbarHeaderInline loadToolbarHeader">
            <div className="h2with">
              <h2>Load city file</h2>

            </div>
            <label className="uploadButton compactUploadButton">
              <input type="file" accept=".citb,.cit,.json,application/json" onChange={handleFileUpload} />
              <span>{uploadState === 'loading' ? 'Loading...' : 'Load'}</span>
            </label>
          </div>
          <small>Можно загрузить .citb, .cit или уже готовый .json.</small>
          {uploadMessage ? <div className={`resultsHint ${uploadState === 'error' ? 'errorText' : ''}`}>{uploadMessage}</div> : null}
        </div>

        <div className="toolbarCard">
          <div className="toolbarHeader toolbarHeaderInline toolbarHeaderBlock">
            <div>
              <h2>Search & filters</h2>
              <small>Быстрый поиск сверху, сложные сочетания — ниже через +.</small>
            </div>
          </div>
          <div className="toolbarActionsInline toolbarHeaderPanel">
            <FieldToggles value={visibility} onChange={setVisibility} />
          </div>
          <hr className="toolbarDivider" />

          <div className="searchStack">
            <div className="searchStackRow">
              <select className="compactControl searchModeSelect" value={filters.searchMode} onChange={(event) => updateFilter('searchMode', event.target.value as SearchMode)}>
                {SEARCH_MODE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label className="sortToggle inlineSortToggle" title={`Sort by ${filters.sortBy === 'id' ? 'ID' : 'Name'}`}>
                <span>{filters.sortBy === 'id' ? 'ID' : 'Name'}</span>
                <input type="checkbox" checked={filters.sortBy === 'name'} onChange={(event) => updateFilter('sortBy', event.target.checked ? 'name' : 'id')} />
                <span className="sortToggleTrack">
                  <span className="sortToggleThumb" />
                </span>
              </label>
            </div>

            <input
              className="searchInput"
              type="text"
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder={filters.searchMode === 'id' ? 'Например: 2' : 'Введи запрос по выбранному полю'}
            />
          </div>

          <div className="filterGrid basicFilterGrid">
            <select className="filterSelect" value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)}>
              <option value="">Any gender</option>
              {filterOptions.genders.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select className="filterSelect" value={filters.heightCategory} onChange={(event) => updateFilter('heightCategory', event.target.value)}>
              <option value="">Any height</option>
              {filterOptions.heightCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input className="filterSelect" type="number" inputMode="numeric" placeholder="Exact height cm" value={filters.exactHeight} onChange={(event) => updateFilter('exactHeight', event.target.value)} />
            <input className="filterSelect" type="number" inputMode="numeric" placeholder="Exact weight kg" value={filters.exactWeight} onChange={(event) => updateFilter('exactWeight', event.target.value)} />
          </div>

          <hr className="toolbarDivider" />

          <div className="advancedFiltersHead">
            <span>Advanced filters</span>
            <button className="ghostButton" type="button" onClick={addAdvancedFilter} disabled={availableAdvancedFields.length === 0}>
              + Add filter
            </button>
          </div>

          <div className="advancedFiltersList">
            {filters.advanced.length === 0 ? <div className="resultsHint">Добавь строку и выбери поле, например Company + ручной ввод справа.</div> : null}
            {filters.advanced.map((item) => {
              const currentOption = ADVANCED_OPTIONS.find((option) => option.value === item.field);
              const optionsForRow = [
                ...(currentOption ? [currentOption] : []),
                ...availableAdvancedFields.filter((option) => option.value !== item.field),
              ];

              return (
                <div key={item.id} className="advancedFilterRow">
                  <select className="filterSelect" value={item.field} onChange={(event) => updateAdvancedFilter(item.id, { field: event.target.value as AdvancedFilterField })}>
                    {optionsForRow.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input className="searchInput" type="text" value={item.value} placeholder="Enter value" onChange={(event) => updateAdvancedFilter(item.id, { value: event.target.value })} />
                  <button className="iconButton" type="button" onClick={() => removeAdvancedFilter(item.id)} aria-label="Remove filter">
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="actionRow">
            <button className="ghostButton" type="button" onClick={resetFilters}>
              Reset filters
            </button>
            <div className="resultsHint">
              Found: <strong>{filteredCitizens.length}</strong>
            </div>
          </div>
        </div>
      </aside>

      <main className="contentArea">
        {hasData ? (
          <div className="cardsList cardsGrid">
            {filteredCitizens.map((citizen) => (
              <CitizenCard key={`${citizen.id}-${citizen.name.full}`} citizen={citizen} visible={visibility} />
            ))}
          </div>
        ) : (
          <div className="emptyStateCard">
            <div className="emptyStateInner">
              <span className="badge muted">No data yet</span>
              <h2>Load city file</h2>
              <p>Сейчас проект стартует пустым, без заранее подгруженного JSON. Загрузить можно .citb, .cit или .json.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
