import "@/styles/globals.css";
import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";

/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */
Amplify.configure(outputs);

const client = generateClient({ authMode: "userPool" });

export default function App() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  async function fetchItems() {
    try {
      const { data: items } = await client.models.BucketItem.list();
      await Promise.all(
        items.map(async (item) => {
          if (item.image) {
            const linkToStorageFile = await getUrl({
              path: ({ identityId }) => `media/${identityId}/${item.image}`,
            });
            item.image = linkToStorageFile.url;
          }
          return item;
        })
      );
      setItems(items);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  }

  async function createItem(event) {
    event.preventDefault();
    const form = new FormData(event.target);

    const { data: newItem } = await client.models.BucketItem.create({
      title: form.get("title"),
      description: form.get("description"),
      image: form.get("image").name,
    });

    if (newItem.image) {
      await uploadData({
        path: ({ identityId }) => `media/${identityId}/${newItem.image}`,
        data: form.get("image"),
      }).result;
    }

    fetchItems();
    event.target.reset();
  }

  async function deleteItem({ id }) {
    await client.models.BucketItem.delete({ id });
    fetchItems();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => {
        // ✅ safely update state without hooks inside render prop
        if (!user) return null; // prevent render until user is available
        if (!user?.username) return null; // optional extra check
        if (!user || !user.signInDetails) setUser(user);

        return (
          <Flex
            justifyContent="center"
            alignItems="center"
            direction="column"
            width="70%"
            margin="0 auto">
            <Heading level={1}>My Bucket List</Heading>

            <View as="form" margin="3rem 0" onSubmit={createItem}>
              <Flex direction="column" gap="2rem" padding="2rem">
                <TextField
                  name="title"
                  placeholder="Bucket List Item"
                  label="Bucket List Item"
                  labelHidden
                  variation="quiet"
                  required
                />
                <TextField
                  name="description"
                  placeholder="Description"
                  label="Description"
                  labelHidden
                  variation="quiet"
                  required
                />
                <View
                  name="image"
                  as="input"
                  type="file"
                  alignSelf={"end"}
                  accept="image/png, image/jpeg"
                />

                <Button type="submit" variation="primary">
                  Add to Bucket List
                </Button>
              </Flex>
            </View>

            <Divider />
            <Heading level={2}>My Bucket List Items</Heading>
            <Grid
              margin="3rem 0"
              autoFlow="column"
              justifyContent="center"
              gap="2rem"
              alignContent="center">
              {items.map((item) => (
                <Flex
                  key={item.id || item.title}
                  direction="column"
                  justifyContent="center"
                  alignItems="center"
                  gap="2rem"
                  border="1px solid #ccc"
                  padding="2rem"
                  borderRadius="5%"
                  className="box">
                  <View>
                    <Heading level="3">{item.title}</Heading>
                  </View>
                  <Text fontStyle="italic">{item.description}</Text>
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={`Visual for ${item.title}`}
                      style={{ width: 400 }}
                    />
                  )}
                  <Button
                    variation="destructive"
                    onClick={() => deleteItem(item)}>
                    Delete Item
                  </Button>
                </Flex>
              ))}
            </Grid>

            <Button onClick={signOut}>Sign Out</Button>
          </Flex>
        );
      }}
    </Authenticator>
  );
}
