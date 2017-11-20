import React, {Component} from 'react'
import Link from './Link'
import {graphql} from 'react-apollo'
import gql from 'graphql-tag'
import { LINKS_PER_PAGE } from '../constants'

class LinkList extends Component {

  componentDidMount() {
    this._subscribeToNewLinks()
    this._subscribeToNewVotes()
  }

  _subscribeToNewLinks = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql `
      subscription {
        Link(filter: {
          mutation_in: [CREATED]
        }) {
          node {
            id
            url
            description
            createdAt
            postedBy {
              id
              name
            }
            votes {
              id
              user {
                id
              }
            }
          }
        }
      }
    `,
      updateQuery: (previous, {subscriptionData}) => {
        const newAllLinks = [
          subscriptionData.Link.node, ...previous.allLinks
        ]
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }

  _subscribeToNewVotes = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql `
      subscription {
        Vote(filter: {
          mutation_in: [CREATED]
        }) {
          node {
            id
            link {
              id
              url
              description
              createdAt
              postedBy {
                id
                name
              }
              votes {
                id
                user {
                  id
                }
              }
            }
            user {
              id
            }
          }
        }
      }
    `,
      updateQuery: (previous, {subscriptionData}) => {
        const votedLinkIndex = previous.allLinks.findIndex(link => link.id === subscriptionData.Vote.node.link.id)
        const link = subscriptionData.Vote.node.link
        const newAllLinks = previous.allLinks.slice()
        newAllLinks[votedLinkIndex] = link
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }

  _updateCacheAfterVote = (store, createVote, linkId) => {
    // 1
    const data = store.readQuery({query: ALL_LINKS_QUERY})

    // 2
    const votedLink = data.allLinks.find(link => link.id === linkId)
    votedLink.votes = createVote.link.votes

    // 3
    store.writeQuery({query: ALL_LINKS_QUERY, data})
  }

  render() {

    // 1
    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return <div>Loading</div>
    }

    // 2
    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return <div>Error</div>
    }

    // 3
    const linksToRender = this.props.allLinksQuery.allLinks

    return (
      <div>
        {linksToRender.map((link, index) => (<Link key={link.id} updateStoreAfterVote={this._updateCacheAfterVote} index={index} link={link}/>))}
      </div>
    )
  }

}

export const ALL_LINKS_QUERY = gql`
  query AllLinksQuery($first: Int, $skip: Int, $orderBy: LinkOrderBy) {
      allLinks(first: $first, skip: $skip, orderBy: $orderBy) {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      _allLinksMeta {
        count
      }
    }
`

export default graphql(ALL_LINKS_QUERY, {
  name: 'allLinksQuery',
  options: (ownProps) => {
    const page = parseInt(ownProps.match.params.page, 10)
    const isNewPage = ownProps.location.pathname.includes('new')
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? 'createdAt_DESC' : null
    return {
      variables: { first, skip, orderBy }
    }
  }
})(LinkList)
