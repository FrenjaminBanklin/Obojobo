require('./people-search-dialog.scss')

const React = require('react')
const { useEffect } = require('react')
const Button = require('./button')
const Search = require('./search')
const PoepleListItem = require('./people-list-item')

const PeopleSearchDialog = props => {
	// clear results on initial render
	useEffect(() => {props.clearPeopleSearchResults()}, [])

	// handle calling 2 prop methods when selecting
	const onSelectPerson = (user) => {
		props.onSelectPerson(user)
		props.onClose()
	}

	return (
		<div className="people-search-dialog" >
			<Button className="close-button" onClick={props.onClose}>X</Button>
			<h1 className="title">Find Users to Share With</h1>
			<div className="sub-title">Poeple who can edit this module</div>
			<Search
				onChange={props.onSearchChange}
				focusOnMount={true}
				placeholder="Search..."
				value={props.searchString}
			/>
			<div className="access-list-wrapper">
				<ul className="access-list">
					{props.people.map(p =>
						<PoepleListItem
							key={p.id}
							isMe={p.id === props.currentUserId}
							{...p}
						>
							<Button className="select-button" onClick={() => onSelectPerson(p)}>
								Select
							</Button>
						</PoepleListItem>
					)}

				</ul>
			</div>
		</div>
	)
}

module.exports = PeopleSearchDialog
