import React from 'react'
import { mount } from 'enzyme'
import renderer from 'react-test-renderer'
import Rubric from './editor-component'

describe('Rubric editor', () => {
	test('component renders', () => {
		const component = renderer.create(
			<Rubric
				node={{
					data: {
						get: () => {
							return {}
						}
					}
				}}
			/>
		)
		const tree = component.toJSON()

		expect(tree).toMatchSnapshot()
	})

	test('component adds child', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)

		const props = {
			node: {
				data: {
					get: () => ({})
				},
				nodes: { size: 0 }
			},
			editor: {
				insertNodeByKey: jest.fn()
			}
		}

		const component = mount(<Rubric {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('component adds child to existing mod list', () => {
		jest.spyOn(window, 'prompt')
		window.prompt.mockReturnValueOnce(null)
		const props = {
			node: {
				data: {
					get: () => ({})
				},
				nodes: {
					size: 5,
					get: jest.fn().mockReturnValueOnce({
						key: 'mockModList',
						nodes: { size: 0 }
					})
				}
			},
			editor: {
				insertNodeByKey: jest.fn()
			}
		}

		const component = mount(<Rubric {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(0)
			.simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('component deletes self', () => {
		const props = {
			node: {
				data: {
					get: () => {
						return {}
					}
				}
			},
			editor: {
				removeNodeByKey: jest.fn()
			}
		}

		const component = mount(<Rubric {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(1)
			.simulate('click')

		expect(tree).toMatchSnapshot()
		expect(props.editor.removeNodeByKey).toHaveBeenCalled()
	})
})
