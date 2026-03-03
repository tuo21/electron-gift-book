import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatisticsPanel from '../business/StatisticsPanel.vue'
import type { Statistics } from '../../types/database'

describe('StatisticsPanel', () => {
  const defaultStatistics: Statistics = {
    totalCount: 10,
    totalAmount: 5000,
    cashAmount: 3000,
    wechatAmount: 1500,
    internalAmount: 500,
  }

  it('should render statistics', () => {
    const wrapper = mount(StatisticsPanel, {
      props: {
        statistics: defaultStatistics,
        hideAmount: false,
      },
    })

    expect(wrapper.text()).toContain('10')
  })

  it('should hide amount when hideAmount is true', () => {
    const wrapper = mount(StatisticsPanel, {
      props: {
        statistics: defaultStatistics,
        hideAmount: true,
      },
    })

    expect(wrapper.text()).toContain('****')
  })

  it('should show amount when hideAmount is false', () => {
    const wrapper = mount(StatisticsPanel, {
      props: {
        statistics: defaultStatistics,
        hideAmount: false,
      },
    })

    expect(wrapper.text()).toContain('5,000.00')
  })

  it('should emit toggle-amount event when clicking amount', () => {
    const wrapper = mount(StatisticsPanel, {
      props: {
        statistics: defaultStatistics,
        hideAmount: false,
      },
    })

    wrapper.find('.amount-total').trigger('click')
    expect(wrapper.emitted('toggle-amount')).toBeTruthy()
  })
})
