import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordForm from '../RecordForm.vue'

describe('RecordForm', () => {
  it('should render form fields', () => {
    const wrapper = mount(RecordForm)

    expect(wrapper.find('input[placeholder="请输入姓名"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="请输入金额"]').exists()).toBe(true)
    expect(wrapper.find('button[type="button"]').exists()).toBe(true)
  })

  it('should show form title', () => {
    const wrapper = mount(RecordForm)

    expect(wrapper.text()).toContain('礼金录入')
  })

  it('should emit submit event with valid data', async () => {
    const wrapper = mount(RecordForm)

    await wrapper.find('input[placeholder="请输入姓名"]').setValue('张三')
    await wrapper.find('input[placeholder="请输入金额"]').setValue('100')

    await wrapper.find('.submit-btn').trigger('click')

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    
    const record = emitted?.[0]?.[0] as any
    expect(record.guestName).toBe('张三')
    expect(record.amount).toBe(100)
  })

  it('should not emit submit with invalid data', async () => {
    const wrapper = mount(RecordForm)

    await wrapper.find('.submit-btn').trigger('click')

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('should clear form when clear button clicked', async () => {
    const wrapper = mount(RecordForm)

    await wrapper.find('input[placeholder="请输入姓名"]').setValue('张三')
    await wrapper.find('input[placeholder="请输入金额"]').setValue('100')

    await wrapper.find('.clear-btn').trigger('click')

    const nameInput = wrapper.find('input[placeholder="请输入姓名"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('')
  })

  it('should have payment type buttons', () => {
    const wrapper = mount(RecordForm)

    expect(wrapper.findAll('.payment-btn').length).toBeGreaterThan(0)
  })

  it('should select payment type when button clicked', async () => {
    const wrapper = mount(RecordForm)

    const buttons = wrapper.findAll('.payment-btn')
    await buttons[1].trigger('click')

    expect(buttons[1].classes()).toContain('active')
  })
})
