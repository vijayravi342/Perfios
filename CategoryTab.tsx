//@ts-nocheck
import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import { useSelector, useDispatch, connect } from 'react-redux'
import { Box, Divider, Paper, Tooltip, Typography } from '@material-ui/core';
import ImageCarousel from './ImageCarousel';
import { changeTab, updatePageNumOnSlide } from 'actions/MultiDocClassifierActions';
import { CustomisedTab, CustomisedTabs, getAllDocumentCategoryNames } from './TreeUtility';
import { IMultiDocClassifierReducer, IReducer } from 'interfaces/commonInterfaces';
import { ICategoryPageNum, IDocumentCategory } from 'interfaces/multiDocClassifierInterfaces';

interface IProps {
  multiDocClassifierReducer: IMultiDocClassifierReducer
}

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box style={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function sortWithAll(cat: Array<String>) {
  cat.sort((a, b) => {
    if (a === 'ALL') {
      return -1
    }
    if (b === 'ALL') {
      return 1
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
  return cat;
}

const CategoryTab: React.FC<IProps> = (props: any) => {

  const currentTab: string = props.multiDocClassifierReducer.currentTab;
  const categoryPageNum: ICategoryPageNum = props.multiDocClassifierReducer.categoryPageNum;
  const [acronymDictionary, setAcronymDictionary] = useState<Record<string, string>>({});
  const dispatch = useDispatch();
  const [value, setValue] = useState(0);

  const handleChange = (_event: any, newValue) => {
    let tabKeys = sortWithAll(Object.keys(categoryPageNum));
    if (categoryPageNum[tabKeys[newValue]] && categoryPageNum[tabKeys[newValue]].length > 0) {
      dispatch(updatePageNumOnSlide(categoryPageNum[tabKeys[newValue]][0]));
    }
    dispatch(changeTab(tabKeys[newValue]))
    setValue(newValue);
  };

  useEffect(() => {
    let index = sortWithAll(Object.keys(categoryPageNum)).findIndex(val => val === currentTab);
    if (index !== -1) {
      setValue(index);
    }
  }, [props.multiDocClassifierReducer.currentTab]);

  useEffect(() => {
    const documentCategories: IDocumentCategory = props.multiDocClassifierReducer.documentCategories;
    const acronymDictionary: Record<string, string> = getAllDocumentCategoryNames(documentCategories).acronymDictionary;
    setAcronymDictionary(acronymDictionary);
  }, [props.multiDocClassifierReducer.documentCategories])

  return (
    <Paper className='CategoryTabs-Container'>
      <Box className='CategoryTabs-InnerContainer'>
        <Box>
          <CustomisedTabs
            className='Tabs'
            value={value}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="scrollable"
          >
            {categoryPageNum && sortWithAll(Object.keys(categoryPageNum)).map((val, index) => {
              return (
                <CustomisedTab
                  label={
                    <Tooltip title={val} placement='top'>
                      <span>{acronymDictionary[val] ? acronymDictionary[val] : val}</span>
                    </Tooltip>}
                  {...a11yProps(index)}
                >
                </CustomisedTab>
              )
            })
            }
          </CustomisedTabs>
        </Box>
        <Divider />
        {categoryPageNum && sortWithAll(Object.keys(categoryPageNum)).map((val, i) =>
          <Check value={value} index={i} val={val} categoryPageNum={categoryPageNum} />)
        }
      </Box>
    </Paper >
  );
}

const Check: React.FC<IProps> = (props: any) => {
  const { categoryPageNum, value, index, val } = props
  const filePathObject: Record<string, string> = useSelector((state: IReducer) => state.multiDocClassifierReducer.filePathObject)
  let Pages = []
  categoryPageNum[val].map((pageNum) => {
    let Obj = {
      original: filePathObject[pageNum],
      thumbnail: filePathObject[pageNum],
      description: pageNum
    }
    Pages.push(Obj)
  });

  return (
    <TabPanel value={value} index={index}>
      <ImageCarousel pages={Pages} />
    </TabPanel>
  )
}

const mapStateToProps = (state: any) => ({
  multiDocClassifierReducer: state.multiDocClassifierReducer
})

export default connect(
  mapStateToProps,
  // mapDispatchToProps
)(CategoryTab);



