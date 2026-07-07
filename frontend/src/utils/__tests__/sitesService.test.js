import { describe, it, expect } from 'vitest'
import { filterActiveSites, isSiteActive, stripSiteIsActiveColumn } from '../../services/sitesService'

describe('sitesService', () => {
  it('treats missing is_active as active', () => {
    expect(isSiteActive({ id: '1', name: 'Forest A' })).toBe(true)
  })

  it('filters inactive sites', () => {
    const sites = [
      { id: '1', name: 'Active', is_active: true },
      { id: '2', name: 'Inactive', is_active: false },
      { id: '3', name: 'Legacy' },
    ]
    expect(filterActiveSites(sites).map((s) => s.id)).toEqual(['1', '3'])
  })

  it('strips is_active from select columns', () => {
    expect(stripSiteIsActiveColumn('id, name, is_active')).toBe('id, name')
    expect(stripSiteIsActiveColumn('*')).toBe('*')
  })
})